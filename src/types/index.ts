/** Payload stored alongside every vector in Qdrant. */
export interface LawChunkPayload {
  actName: string;
  actShortCode: string; // BNS, BNSS, BSA, CONST, ...
  sectionNumber: string; // "318", "63", "Article 21"
  sectionTitle: string;
  text: string;
  punishment?: string;
  bailable?: string; // Bailable | Non-Bailable | NA
  cognizable?: string; // Cognizable | Non-Cognizable | NA
  compoundable?: string; // Yes | No | NA
  jurisdiction: string; // central | <state>
  docType: "STATUTE" | "JUDGMENT" | "NOTIFICATION" | "CONSTITUTION";
  sourceUrl?: string;
  lastAmended?: string;
}

/** A chunk ready to embed + upsert. */
export interface LawChunk {
  id: string; // deterministic uuid from actShortCode + sectionNumber
  payload: LawChunkPayload;
}

/** A chunk returned from retrieval, with its similarity score. */
export interface RetrievedChunk extends LawChunkPayload {
  id: string;
  score: number;
  matchType: "dense" | "keyword";
}

/** Output of the retriever — chunks plus a grounding signal. */
export interface RetrievalResult {
  chunks: RetrievedChunk[];
  topScore: number;
  confident: boolean; // false → pipeline emits "not sufficiently confident"
}
