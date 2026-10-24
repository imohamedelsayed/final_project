const { EntitySchema } = require('typeorm');

const StoreSettingSchema = new EntitySchema({
  name: 'StoreSetting',
  tableName: 'store_settings',
  columns: {
    id: {
      primary: true,
      type: 'smallint'
    },
    whatsapp_number: {
      type: 'varchar',
      length: 30,
      nullable: false
    },
    updated_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  }
});

module.exports = {
  StoreSettingSchema
};
