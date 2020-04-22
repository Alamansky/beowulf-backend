# Create .env file for use by docker-compose.yml

echo Let\'s set up the .env file.;

# Create MySQL credentials

echo What is the MySQL root password?;

read MYSQL_ROOT_PASSWORD;

echo Who is the MySQL user?;

read MYSQL_USER;

# Create Prisma credentials
echo What is the Prisma Management API Secret?;

read PRISMA_MANAGEMENT_API_SECRET;

echo What is the Prisma service secret?;

read PRISMA_SECRET;

# Set up .env file

touch .env;

echo "

# service: MySQL

MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_USER=$MYSQL_USER

# service: Prisma

PRISMA_MANAGEMENT_API_SECRET=$PRISMA_MANAGEMENT_API_SECRET
PRISMA_SECRET=$PRISMA_SECRET

" > .env

echo .env file created;
