const serializeModel = (model, schema, hidden) => {
    if (!schema || !model) return model;
    const keys = Object.keys(schema);
    keys.forEach((key) => {
        if (hidden && hidden.length && hidden.includes(key)) delete model[key];
        else if (
            schema[key] &&
            model[key] &&
            typeof schema[key] === 'function'
        ) {
            model[key] = schema.key(model[key]);
        }
    });

    return model;
};

export { serializeModel };
