echo "

type Query {
  user(id: ID!): User
}

type Mutation {
  createUser(name: String!): User
}

type User {
  id: ID!
  name: String
}


" > schema.graphql

echo schema file created;