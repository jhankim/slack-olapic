const olapicAPIConfig = {
  host: process.env.OLAPIC_API_HOST,
  headers: {
    Authorization: `ApiKey token="${process.env.OLAPIC_API_KEY}"`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

module.exports = olapicAPIConfig;
