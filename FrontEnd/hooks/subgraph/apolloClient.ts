// subgraph/apolloClient.ts
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://api.studio.thegraph.com/query/107458/gift-chain/v0.1.1",
  }),
  cache: new InMemoryCache(),
});

export default client;