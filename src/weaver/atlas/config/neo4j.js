import neo4j from 'neo4j-driver';

const uri =
  process.env.NEO4J_URI?.replace(/['";"]/g, '') || import.meta.env.NETLIFY_NEO4J_URI;
const username =
  process.env.NEO4J_USERNAME?.replace(/['";"]/g, '') ||
  import.meta.env.NETLIFY_NEO4J_USERNAME;
const password =
  process.env.NEO4J_PASSWORD?.replace(/['";"]/g, '') ||
  process.env.NEO4J_PASSWORD;

export const driver = neo4j.driver(
    uri, 
    neo4j.auth.basic(username, password)
);