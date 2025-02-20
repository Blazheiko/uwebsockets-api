import { SchemaBuilder } from 'knex';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const up = (knex) => {
    return knex.schema.createTable('users', function (table) {
        table.increments('id');
        table.string('name', 100).notNullable();
        table.string('email', 255).notNullable();
        table.string('password', 255).notNullable();
        table.boolean('isAdmin').nullable();
        table
            .timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { SchemaBuilder }
 */
const down = (knex) => {
    return knex.schema.dropTable('users');
};

export { up, down };
