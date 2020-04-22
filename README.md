# dockerfiles

## Prisma

To set up a workflow with Prisma and Yoga, use the following commands:

On host machine:

1. `./init.sh` // set up .env file
2. `docker-compose up` // start 3 containers; database, prisma, and node
3. `docker-attach <node> bash` // bash into node container

In node container:

1. `npm init -y` // initialize package.json
2. `./install.sh` // install dependencies
3. `prisma init --endpoint http://prisma:4466` // initialize prisma on container port (NOT localhost!)
4. `./update-prisma-config.sh` // add secret and generate fields to prisma.yml
5. `prisma generate` // generate prisma client lib
6. `prisma deploy` // deploy
7. `./create-schema.sh` // generate starter schema file for yoga
8. `npx nodemon index.js` // start dev server
