// components/ApolloWrapper.tsx
"use client";

import { ApolloProvider } from "@apollo/client";
import client from "../app/subgraph/apolloClient";

export default function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}