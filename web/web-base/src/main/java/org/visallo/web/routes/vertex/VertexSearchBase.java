package org.visallo.web.routes.vertex;

import com.google.inject.Inject;
import org.json.JSONArray;
import org.json.JSONObject;
import org.vertexium.Authorizations;
import org.vertexium.FetchHint;
import org.vertexium.Graph;
import org.vertexium.Vertex;
import org.vertexium.query.*;
import org.vertexium.util.CloseableIterable;
import org.visallo.core.config.Configuration;
import org.visallo.core.exception.VisalloException;
import org.visallo.core.model.ontology.Concept;
import org.visallo.core.model.ontology.OntologyProperty;
import org.visallo.core.model.ontology.OntologyRepository;
import org.visallo.core.model.properties.VisalloProperties;
import org.visallo.core.trace.Trace;
import org.visallo.core.trace.TraceSpan;
import org.visallo.core.util.ClientApiConverter;
import org.visallo.core.util.JSONUtil;
import org.visallo.core.util.VisalloLogger;
import org.visallo.core.util.VisalloLoggerFactory;
import org.visallo.web.clientapi.model.ClientApiSearchResponse;
import org.visallo.web.clientapi.model.ClientApiVertex;
import org.visallo.web.clientapi.model.ClientApiVertexSearchResponse;
import org.visallo.web.clientapi.model.PropertyType;
import org.visallo.web.parameterProviders.VisalloBaseParameterProvider;

import javax.servlet.http.HttpServletRequest;
import java.text.ParseException;
import java.util.*;

public abstract class VertexSearchBase {
    private static final VisalloLogger LOGGER = VisalloLoggerFactory.getLogger(VertexSearch.class);
    private final Graph graph;
    private final OntologyRepository ontologyRepository;
    private int defaultSearchResultCount;

    @Inject
    public VertexSearchBase(
            final OntologyRepository ontologyRepository,
            final Graph graph,
            final Configuration configuration
    ) {
        this.ontologyRepository = ontologyRepository;
        this.graph = graph;
        defaultSearchResultCount = configuration.getInt(Configuration.DEFAULT_SEARCH_RESULT_COUNT, 100);
    }

    protected ClientApiVertexSearchResponse handle(
            HttpServletRequest request,
            String workspaceId,
            Authorizations authorizations
    ) throws Exception {
        long totalStartTime = System.nanoTime();

        long startTime = System.nanoTime();

        JSONArray filterJson = getFilterJson(request);

        QueryAndData queryAndData = getQuery(request, authorizations);
        applyFiltersToQuery(queryAndData, filterJson);
        applyConceptTypeFilterToQuery(queryAndData, request);
        applySortToQuery(queryAndData, request);
        applyAggregationsToQuery(queryAndData, request);

        EnumSet<FetchHint> fetchHints = VisalloBaseParameterProvider.getOptionalParameterFetchHints(request, "fetchHints", ClientApiConverter.SEARCH_FETCH_HINTS);
        final int offset = VisalloBaseParameterProvider.getOptionalParameterInt(request, "offset", 0);
        final int size = VisalloBaseParameterProvider.getOptionalParameterInt(request, "size", defaultSearchResultCount);
        queryAndData.getQuery().limit(size);
        queryAndData.getQuery().skip(offset);

        Iterable<Vertex> searchResults = getSearchResults(queryAndData, fetchHints);

        Map<String, Double> scores = null;
        if (searchResults instanceof IterableWithScores) {
            scores = ((IterableWithScores<?>) searchResults).getScores();
        }

        long retrievalStartTime = System.nanoTime();
        List<ClientApiVertex> verticesList = convertVerticesToClientApi(queryAndData, searchResults, scores, workspaceId, authorizations);
        long retrievalEndTime = System.nanoTime();

        long totalEndTime = System.nanoTime();

        ClientApiVertexSearchResponse results = new ClientApiVertexSearchResponse();
        results.getVertices().addAll(verticesList);
        results.setNextOffset(offset + size);
        results.setRetrievalTime(retrievalEndTime - retrievalStartTime);
        results.setTotalTime(totalEndTime - totalStartTime);

        addSearchResultsDataToResults(results, queryAndData, searchResults);

        long endTime = System.nanoTime();
        LOGGER.info("Search found %d vertices in %dms", verticesList.size(), (endTime - startTime) / 1000 / 1000);

        if (searchResults instanceof CloseableIterable) {
            ((CloseableIterable) searchResults).close();
        }

        return results;
    }

    private void addSearchResultsDataToResults(ClientApiVertexSearchResponse results, QueryAndData queryAndData, Iterable<Vertex> searchResults) {
        if (searchResults instanceof IterableWithTotalHits) {
            results.setTotalHits(((IterableWithTotalHits) searchResults).getTotalHits());
        }
        if (searchResults instanceof IterableWithSearchTime) {
            results.setSearchTime(((IterableWithSearchTime) searchResults).getSearchTimeNanoSeconds());
        }
        if (searchResults instanceof IterableWithTermsResults) {
            for (String termsAggregateName : queryAndData.getTermAggregationNames()) {
                TermsResult agg = ((IterableWithTermsResults) searchResults).getTermsResults(termsAggregateName);
                results.getAggregates().put(termsAggregateName, toClientApiTermsAggregateResult(agg));
            }
        }
        if (searchResults instanceof IterableWithGeohashResults) {
            for (String geoHashAggregateName : queryAndData.getGeohashAggregationNames()) {
                GeohashResult agg = ((IterableWithGeohashResults) searchResults).getGeohashResults(geoHashAggregateName);
                results.getAggregates().put(geoHashAggregateName, toClientApiGeohashResult(agg));
            }
        }
        if (searchResults instanceof IterableWithHistogramResults) {
            for (String histogramAggregateName : queryAndData.getHistogramAggregationNames()) {
                HistogramResult agg = ((IterableWithHistogramResults) searchResults).getHistogramResults(histogramAggregateName);
                results.getAggregates().put(histogramAggregateName, toClientApiHistogramResult(agg));
            }
        }
    }

    private ClientApiSearchResponse.AggregateResult toClientApiHistogramResult(HistogramResult agg) {
        ClientApiSearchResponse.HistogramAggregateResult result = new ClientApiSearchResponse.HistogramAggregateResult();
        for (HistogramBucket histogramBucket : agg.getBuckets()) {
            result.getBuckets().put(histogramBucket.getKey().toString(), histogramBucket.getCount());
        }
        return result;
    }

    private ClientApiSearchResponse.AggregateResult toClientApiGeohashResult(GeohashResult agg) {
        ClientApiSearchResponse.GeohashAggregateResult result = new ClientApiSearchResponse.GeohashAggregateResult();
        result.setMaxCount(agg.getMaxCount());
        for (GeohashBucket geohashBucket : agg.getBuckets()) {
            ClientApiSearchResponse.GeohashAggregateResult.Bucket b = new ClientApiSearchResponse.GeohashAggregateResult.Bucket(
                    ClientApiConverter.toClientApiGeoRect(geohashBucket.getGeoCell()),
                    ClientApiConverter.toClientApiGeoPoint(geohashBucket.getGeoPoint()),
                    geohashBucket.getCount()
            );
            result.getBuckets().put(geohashBucket.getKey(), b);
        }
        return result;
    }

    private ClientApiSearchResponse.TermsAggregateResult toClientApiTermsAggregateResult(TermsResult agg) {
        ClientApiSearchResponse.TermsAggregateResult result = new ClientApiSearchResponse.TermsAggregateResult();
        for (TermsBucket termsBucket : agg.getBuckets()) {
            result.getBuckets().put(termsBucket.getKey().toString(), termsBucket.getCount());
        }
        return result;
    }

    private void applyAggregationsToQuery(QueryAndData queryAndData, HttpServletRequest request) {
        Query query = queryAndData.getQuery();
        String[] aggregates = VisalloBaseParameterProvider.getOptionalParameterAsStringArray(request, "aggregations[]");
        if (aggregates == null) {
            return;
        }
        for (String aggregate : aggregates) {
            JSONObject aggregateJson = new JSONObject(aggregate);
            String field;
            String aggregationName = aggregateJson.getString("name");
            String type = aggregateJson.getString("type");
            switch (type) {
                case "term":
                    if (!(query instanceof GraphQueryWithTermsAggregation)) {
                        throw new VisalloException("Query does not support: " + GraphQueryWithTermsAggregation.class.getName());
                    }
                    field = aggregateJson.getString("field");
                    ((GraphQueryWithTermsAggregation) query).addTermsAggregation(aggregationName, field);
                    queryAndData.addTermAggregationName(aggregationName);
                    break;
                case "geohash":
                    if (!(query instanceof GraphQueryWithGeohashAggregation)) {
                        throw new VisalloException("Query does not support: " + GraphQueryWithGeohashAggregation.class.getName());
                    }
                    field = aggregateJson.getString("field");
                    int precision = aggregateJson.getInt("precision");
                    ((GraphQueryWithGeohashAggregation) query).addGeohashAggregation(aggregationName, field, precision);
                    queryAndData.addGeohashAggregationName(aggregationName);
                    break;
                case "histogram":
                    if (!(query instanceof GraphQueryWithHistogramAggregation)) {
                        throw new VisalloException("Query does not support: " + GraphQueryWithHistogramAggregation.class.getName());
                    }
                    field = aggregateJson.getString("field");
                    String interval = aggregateJson.getString("interval");
                    Long minDocumentCount = JSONUtil.getOptionalLong(aggregateJson, "minDocumentCount");
                    ((GraphQueryWithHistogramAggregation) query).addHistogramAggregation(aggregationName, field, interval, minDocumentCount);
                    queryAndData.addHistogramAggregationName(aggregationName);
                    break;
                default:
                    throw new VisalloException("Invalid aggregation type: " + type);
            }
        }
    }

    protected void applySortToQuery(QueryAndData queryAndData, HttpServletRequest request) {
        String[] sorts = VisalloBaseParameterProvider.getOptionalParameterAsStringArray(request, "sort[]");
        if (sorts == null) {
            return;
        }
        for (String sort : sorts) {
            String propertyName = sort;
            SortDirection direction = SortDirection.ASCENDING;
            if (propertyName.toUpperCase().endsWith(":ASCENDING")) {
                direction = SortDirection.ASCENDING;
                propertyName = propertyName.substring(0, propertyName.length() - ":ASCENDING".length());
            } else if (propertyName.toUpperCase().endsWith(":DESCENDING")) {
                direction = SortDirection.DESCENDING;
                propertyName = propertyName.substring(0, propertyName.length() - ":DESCENDING".length());
            }
            queryAndData.getQuery().sort(propertyName, direction);
        }
    }

    protected List<ClientApiVertex> convertVerticesToClientApi(
            QueryAndData queryAndData,
            Iterable<Vertex> searchResults,
            Map<String, Double> scores,
            String workspaceId,
            Authorizations authorizations
    ) {
        List<ClientApiVertex> verticesList = new ArrayList<>();
        for (Vertex vertex : searchResults) {
            Integer commonCount = getCommonCount(queryAndData, vertex);
            ClientApiVertex v = ClientApiConverter.toClientApiVertex(vertex, workspaceId, commonCount, authorizations);
            if (scores != null) {
                v.setScore(scores.get(vertex.getId()));
            }
            verticesList.add(v);
        }
        return verticesList;
    }

    protected Iterable<Vertex> getSearchResults(QueryAndData queryAndData, EnumSet<FetchHint> fetchHints) {
        //noinspection unused
        try (TraceSpan trace = Trace.start("getSearchResults")) {
            return queryAndData.getQuery().vertices(fetchHints);
        }
    }

    protected Integer getCommonCount(QueryAndData queryAndData, Vertex vertex) {
        return null;
    }

    protected abstract QueryAndData getQuery(HttpServletRequest request, Authorizations authorizations);

    protected void applyConceptTypeFilterToQuery(QueryAndData queryAndData, HttpServletRequest request) {
        final String conceptType = VisalloBaseParameterProvider.getOptionalParameter(request, "conceptType");
        final String includeChildNodes = VisalloBaseParameterProvider.getOptionalParameter(request, "includeChildNodes");
        if (conceptType != null) {
            Concept concept = ontologyRepository.getConceptByIRI(conceptType);
            if (includeChildNodes == null || !includeChildNodes.equals("false")) {
                Set<Concept> childConcepts = ontologyRepository.getConceptAndAllChildren(concept);
                if (childConcepts.size() > 0) {
                    String[] conceptIds = new String[childConcepts.size()];
                    int count = 0;
                    for (Concept c : childConcepts) {
                        conceptIds[count] = c.getIRI();
                        count++;
                    }
                    queryAndData.getQuery().has(VisalloProperties.CONCEPT_TYPE.getPropertyName(), Contains.IN, conceptIds);
                }
            } else {
                queryAndData.getQuery().has(VisalloProperties.CONCEPT_TYPE.getPropertyName(), conceptType);
            }
        }
    }

    protected void applyFiltersToQuery(QueryAndData queryAndData, JSONArray filterJson) throws ParseException {
        for (int i = 0; i < filterJson.length(); i++) {
            JSONObject obj = filterJson.getJSONObject(i);
            if (obj.length() > 0) {
                updateQueryWithFilter(queryAndData.getQuery(), obj);
            }
        }
    }

    protected JSONArray getFilterJson(HttpServletRequest request) {
        final String filter = VisalloBaseParameterProvider.getRequiredParameter(request, "filter");
        JSONArray filterJson = new JSONArray(filter);
        ontologyRepository.resolvePropertyIds(filterJson);
        return filterJson;
    }

    private void updateQueryWithFilter(Query graphQuery, JSONObject obj) throws ParseException {
        String predicateString = obj.optString("predicate");
        String propertyName = obj.getString("propertyName");
        if ("has".equals(predicateString)) {
            graphQuery.has(propertyName);
        } else if ("hasNot".equals(predicateString)) {
            graphQuery.hasNot(propertyName);
        } else {
            PropertyType propertyDataType = PropertyType.convert(obj.optString("propertyDataType"));
            JSONArray values = obj.getJSONArray("values");
            Object value0 = jsonValueToObject(values, propertyDataType, 0);

            if (PropertyType.STRING.equals(propertyDataType) && (predicateString == null || "~".equals(predicateString) || "".equals(predicateString))) {
                graphQuery.has(propertyName, TextPredicate.CONTAINS, value0);
            } else if (PropertyType.BOOLEAN.equals(propertyDataType) && (predicateString == null || "".equals(predicateString))) {
                graphQuery.has(propertyName, Compare.EQUAL, value0);
            } else if ("<".equals(predicateString)) {
                graphQuery.has(propertyName, Compare.LESS_THAN, value0);
            } else if (">".equals(predicateString)) {
                graphQuery.has(propertyName, Compare.GREATER_THAN, value0);
            } else if ("range".equals(predicateString)) {
                graphQuery.has(propertyName, Compare.GREATER_THAN_EQUAL, value0);
                graphQuery.has(propertyName, Compare.LESS_THAN_EQUAL, jsonValueToObject(values, propertyDataType, 1));
            } else if ("=".equals(predicateString) || "equal".equals(predicateString)) {
                graphQuery.has(propertyName, Compare.EQUAL, value0);
            } else if (PropertyType.GEO_LOCATION.equals(propertyDataType)) {
                graphQuery.has(propertyName, GeoCompare.WITHIN, value0);
            } else {
                throw new VisalloException("unhandled query\n" + obj.toString(2));
            }
        }
    }

    private Object jsonValueToObject(JSONArray values, PropertyType propertyDataType, int index) throws ParseException {
        return OntologyProperty.convert(values, propertyDataType, index);
    }

    protected Graph getGraph() {
        return graph;
    }

    protected static class QueryAndData {
        private final Query query;
        private List<String> termAggregationNames = new ArrayList<>();
        private List<String> geohashAggregationNames = new ArrayList<>();
        private List<String> histogramAggregationNames = new ArrayList<>();

        public QueryAndData(Query query) {
            this.query = query;
        }

        public Query getQuery() {
            return query;
        }

        public void addTermAggregationName(String aggregationName) {
            this.termAggregationNames.add(aggregationName);
        }

        public List<String> getTermAggregationNames() {
            return termAggregationNames;
        }

        public List<String> getGeohashAggregationNames() {
            return geohashAggregationNames;
        }

        public List<String> getHistogramAggregationNames() {
            return histogramAggregationNames;
        }

        public void addGeohashAggregationName(String aggregationName) {
            this.geohashAggregationNames.add(aggregationName);
        }

        public void addHistogramAggregationName(String aggregationName) {
            this.histogramAggregationNames.add(aggregationName);
        }
    }
}
