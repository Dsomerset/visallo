# Visallo Features

The following Visallo features are executed as graph property workers deployed in YARN and do not require the installation of additional dependencies.
Also see [Visallo Dependencies by Feature](dependencies.md#visallo-dependencies-by-feature).

| Category | Feature                                                                              | Visallo YARN Plugins                     | Notes |
| -------- | ------------------------------------------------------------------------------------ | --------------------------------------- | ----- |
| text     | identification of e-mail address in text                                             | email-extractor                         | |
| text     | identification of specified terms in text using OpenNLP                              | opennlp-dictionary-extractor            | [OpenNLP](https://opennlp.apache.org/) |
| text     | algorithmic identification of terms in text using OpenNLP                            | opennlp-me-extractor                    | [OpenNLP](https://opennlp.apache.org/) |
| text     | identification of phone numbers in text                                              | phone-number-extractor                  | |
| text     | extract text from supported document filetypes                                       | tika-text-extractor                     | [Tika](http://tika.apache.org/) |
| text     | identification of postal codes in text                                               | zipcode-extractor                       | currently US only |
| text     | resolution of postal code terms to geolocations                                      | zipcode-resolver                        | currently US only |
| media    | annotation of image and video files with date-time, location, and device information | drewnoakes-image-metadata-extractor     | |
| media    | annotation of video files with the text transcript in accompanying .srt files        | subrip-transcript <br /> subrip-parser  | [SubRip](http://zuggy.wz.cz/) |
| media    | annotation of video files with the text transcript in accompanying .cc files         | youtube-transcript                      | |
| system   | sets MIME type metadata property of "raw" properties (e.g. file content)             | tika-mime-type                          | [Tika](http://tika.apache.org/) |
| system   | sets the concept type property of vertices based on their MIME type                  | mime-type-ontology-mapper               | |
| system   | facilitates updating the search index with new or changed data                       | reindex                                 | |
| example  | parse Java code and create the corresponding graph                                   | java-code                               | requires the [java-code ontology](https://github.com/v5analytics/visallo/tree/master/graph-property-worker/plugins/java-code/ontology) |

