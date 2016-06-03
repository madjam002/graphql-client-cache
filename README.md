graphql-client-cache
====================

An experimental GraphQL client cache powered by ImmutableJS.

This is pretty much a code dump from a weekend I had of just experimenting with a few ideas.

## Things I'd like to see in a GraphQL Client

*Please note this library does not solve all of these problems (yet?)*

**Lightweight**
-
It doesn't need to try and solve every possible use case, and shouldn't be a framework.

**No assumptions about rendering layer**
-
It should be a very minimal client which can be used with any rendering library, such as React and Angular.

**Simple mutations**
-
Having a DSL for describing what areas are affected as a result of a mutation can be confusing. Mutations should be very barebones.

**No need to have the schema on the client**
-
Schemas can potentially be very large. We want to avoid having to bundle the GraphQL schema on the client side.

**You should be responsible for dealing with the state of the cache**
-
The state of the cache should just be a simple object (or Immutable Map) which you can do whatever you want with.
