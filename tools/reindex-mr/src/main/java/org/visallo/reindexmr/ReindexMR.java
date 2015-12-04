package org.visallo.reindexmr;

import com.beust.jcommander.Parameter;
import com.google.inject.Inject;
import org.apache.accumulo.core.client.mapreduce.AccumuloInputFormat;
import org.apache.accumulo.core.data.Key;
import org.apache.accumulo.core.data.Range;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.mapred.JobConf;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.output.NullOutputFormat;
import org.apache.hadoop.util.ToolRunner;
import org.vertexium.ElementType;
import org.vertexium.FetchHint;
import org.vertexium.Graph;
import org.vertexium.accumulo.AccumuloGraph;
import org.vertexium.accumulo.mapreduce.AccumuloEdgeInputFormat;
import org.vertexium.accumulo.mapreduce.AccumuloElementInputFormatBase;
import org.vertexium.accumulo.mapreduce.AccumuloVertexInputFormat;
import org.visallo.core.exception.VisalloException;
import org.visallo.core.model.ontology.OntologyRepository;
import org.visallo.core.model.termMention.TermMentionRepository;
import org.visallo.core.model.user.UserRepository;
import org.visallo.core.model.workspace.WorkspaceRepository;
import org.visallo.core.security.VisalloVisibility;
import org.visallo.core.util.VisalloLogger;
import org.visallo.core.util.VisalloLoggerFactory;
import org.visallo.vertexium.mapreduce.VisalloMRBase;

import java.text.SimpleDateFormat;
import java.util.*;

public class ReindexMR extends VisalloMRBase {
    private static VisalloLogger LOGGER;
    private AccumuloGraph graph;
    private ElementType elementType;

    @Parameter(description = "vertex|edge", arity = 1)
    private List<String> type;

    @Parameter(names = {"-o", "--offline"}, description = "Use offline mode (use RFiles instead of tablet servers)")
    private boolean offline = false;

    @Parameter(names = {"--noclone"}, description = "Do not clone the tables while in offline mode (tables will be unusable by Visallo)")
    private boolean noClone = false;

    @Parameter(names = {"--range"}, description = "Colon seperated ranges to index (ex --range a:b)")
    private List<String> ranges = new ArrayList<>();

    public static void main(String[] args) throws Exception {
        LOGGER = VisalloLoggerFactory.getLogger(ReindexMR.class);
        int res = ToolRunner.run(new Configuration(), new ReindexMR(), args);
        System.exit(res);
    }

    @Override
    protected void setupJob(Job job) throws Exception {
        String[] authorizations = new String[]{
                VisalloVisibility.SUPER_USER_VISIBILITY_STRING,
                OntologyRepository.VISIBILITY_STRING,
                UserRepository.VISIBILITY_STRING,
                WorkspaceRepository.VISIBILITY_STRING,
                TermMentionRepository.VISIBILITY_STRING
        };

        job.getConfiguration().setBoolean("mapred.map.tasks.speculative.execution", false);
        job.getConfiguration().setBoolean("mapred.reduce.tasks.speculative.execution", false);

        job.setJarByClass(ReindexMR.class);
        job.setMapperClass(ReindexMRMapper.class);
        job.setOutputFormatClass(NullOutputFormat.class);
        job.setNumReduceTasks(0);

        List<Range> accumuloRanges = getRanges();
        if (accumuloRanges.size() > 0) {
            AccumuloInputFormat.setRanges(job, accumuloRanges);
        }

        if (elementType == ElementType.VERTEX) {
            String verticesTableName = AccumuloGraph.getVerticesTableName(getAccumuloGraphConfiguration().getTableNamePrefix());
            if (offline) {
                if (!noClone) {
                    String verticesCloneTableName = verticesTableName + "_clone_reindex_" + new SimpleDateFormat("yyyyMMdd'T'HHmm").format(new Date());
                    graph.getConnector().tableOperations().clone(
                            verticesTableName,
                            verticesCloneTableName,
                            true,
                            new HashMap<String, String>(),
                            new HashSet<String>());
                    graph.getConnector().tableOperations().offline(verticesCloneTableName, true);
                    verticesTableName = verticesCloneTableName;
                }
                AccumuloInputFormat.setOfflineTableScan(job, true);
            }

            job.setInputFormatClass(AccumuloVertexInputFormat.class);
            AccumuloElementInputFormatBase.setFetchHints(job, ElementType.VERTEX, EnumSet.of(FetchHint.PROPERTIES));
            AccumuloElementInputFormatBase.setInputInfo(job, getInstanceName(), getZooKeepers(), getPrincipal(), getAuthorizationToken(), authorizations, verticesTableName);
        } else if (elementType == ElementType.EDGE) {
            String edgesTableName = AccumuloGraph.getEdgesTableName(getAccumuloGraphConfiguration().getTableNamePrefix());
            if (offline) {
                if (!noClone) {
                    String edgesCloneTableName = edgesTableName + "_clone_reindex_" + new SimpleDateFormat("yyyyMMdd'T'HHmm").format(new Date());
                    graph.getConnector().tableOperations().clone(
                            edgesTableName,
                            edgesCloneTableName,
                            true,
                            new HashMap<String, String>(),
                            new HashSet<String>());
                    graph.getConnector().tableOperations().offline(edgesCloneTableName, true);
                    edgesTableName = edgesCloneTableName;
                }
                AccumuloInputFormat.setOfflineTableScan(job, true);
            }

            job.setInputFormatClass(AccumuloEdgeInputFormat.class);
            AccumuloElementInputFormatBase.setInputInfo(job, getInstanceName(), getZooKeepers(), getPrincipal(), getAuthorizationToken(), authorizations, edgesTableName);
        } else {
            throw new VisalloException("Unhandled element type: " + elementType);
        }
    }

    private List<Range> getRanges() {
        List<Range> accumuloRanges = new ArrayList<>();
        for (String range : ranges) {
            String[] parts = range.split(":");
            if (parts.length != 2) {
                throw new VisalloException("Invalid Range. Must have a single color.");
            }
            Key startKey = new Key(parts[0]);
            Key endKey = new Key(parts[1]);
            Range accumuloRange = new Range(startKey, endKey);
            accumuloRanges.add(accumuloRange);
        }
        return accumuloRanges;
    }

    @Override
    protected void processArgs(JobConf conf, String[] args) {
        String type = this.type.get(0);
        elementType = ElementType.valueOf(type.toUpperCase());
        LOGGER.info("Element type: " + elementType);
    }

    @Override
    protected String getJobName() {
        return "visalloReindex-" + elementType;
    }

    @Inject
    public void setGraph(Graph graph) {
        this.graph = (AccumuloGraph) graph;
    }
}
