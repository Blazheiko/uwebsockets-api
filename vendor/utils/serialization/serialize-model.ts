import logger from '#logger';

const serializeModel = (model: any, schema: any, hidden: string[]) => {
    try {
        if (!schema || !model) return model;
        const keys = Object.keys(model);
        const newModel = { ...model };
        keys.forEach((key) => {
            const handler = schema[key];
            if (hidden && hidden.length && hidden.includes(key))
                delete newModel[key];
            else if (handler && typeof handler === 'function')
                newModel[key] = handler(newModel[key]);
        });
        return newModel;
    } catch (e) {
        logger.error({ err: e });
        throw new Error('Error serializeModel');
    }
};

const serializeArray = (array: any, schema: any, hidden: string[]) => {
    try {
        if (!schema || !array) return array;
        return array.map((item: any) => serializeModel(item, schema, hidden));
    } catch (e) {
        logger.error({ err: e });
        throw new Error('Error serializeArray');
    }
};

export { serializeModel, serializeArray };
