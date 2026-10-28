export const FLOW_VISITOR = "Visitor";
export const FLOW_ASK = "Reaches the server";
export const FLOW_APP = "Application";
export const FLOW_ANSWERS = "Answers";
export const FLOW_UNCHANGED = "The request is not changed.";
export const FLOW_READ = "Collector";
export const FLOW_AFTER = "After the response";
export const FLOW_READ_BODY = "Reads the log and posts the batch.";
export const FLOW_JOURNAL = "The journal";
export const FLOW_EUROPE = "Postgres for accounts. ClickHouse for the lines.";
export const FLOW_ASIDE = "A separate edge";
export const FLOW_NY = "Does not store the journal.";
export const FLOW_CAPTION = "The moving mark is the reading of the log. It does not stand on the request.";

export function flowText() {
  return [FLOW_VISITOR, FLOW_ASK, FLOW_APP, FLOW_ANSWERS, FLOW_UNCHANGED, FLOW_READ, FLOW_AFTER, FLOW_READ_BODY, FLOW_JOURNAL, FLOW_EUROPE, FLOW_ASIDE, FLOW_NY, FLOW_CAPTION].join(" ");
}
