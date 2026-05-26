export interface CitationReference {
  nct_id: string;
  excerpt: string;
  field: string;
}

export interface Citation {
  datum_key: string;
  references: CitationReference[];
}
