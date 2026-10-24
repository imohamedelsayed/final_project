const {
  CreateExtensionsAndAuthTables1730000001000
} = require('./1730000001000-CreateExtensionsAndAuthTables');
const { CreateCatalogTables1730000002000 } = require('./1730000002000-CreateCatalogTables');
const {
  CreateCartsAndCouponsTables1730000003000
} = require('./1730000003000-CreateCartsAndCouponsTables');
const {
  CreateOrdersAndEventsTables1730000004000
} = require('./1730000004000-CreateOrdersAndEventsTables');

const migrations = [
  CreateExtensionsAndAuthTables1730000001000,
  CreateCatalogTables1730000002000,
  CreateCartsAndCouponsTables1730000003000,
  CreateOrdersAndEventsTables1730000004000
];

module.exports = {
  migrations,
  CreateExtensionsAndAuthTables1730000001000,
  CreateCatalogTables1730000002000,
  CreateCartsAndCouponsTables1730000003000,
  CreateOrdersAndEventsTables1730000004000
};
