echo "
secret: \${env:PRISMA_SECRET}
generate:
  - generator: graphql-schema
    output: ./src/generated/prisma.graphql
" >> prisma.yml

echo prisma config updated;