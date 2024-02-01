const { Sequelize } = require('sequelize');

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL is not defined in the environment variables.');
  process.exit(1);
}

const sequelize = new Sequelize(process.env.POSTGRES_URL + "?sslmode=require", {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection to the database has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  });

module.exports = sequelize;
