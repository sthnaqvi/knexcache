"use strict";

/**
 * Parse knex query Object to a String
 * @param {Object} knexObj Knex query Object
 * @private
 */
const parseStringFromKnexQuery = (knexObj) => {
    const { bindings, sql } = knexObj.toSQL();
    return `${sql}:${bindings}`;
}

/**
 * Get cached data from redis cache
 * @param {Redis} redis_client Redis client
 * @param {String} key Key to get value
 * @private
 */
const getCacheData = (redis_client, key) => new Promise((resolve, reject) => {
    redis_client.get(key, function (err, value) {
        if (err) {
            return reject(err);
        }
        //handle parse error if value is not a JSON Object.
        try {
            value = JSON.parse(value);
        } catch (error) {
            //
        }
        return resolve(value);
    });
});

/**
 * Cache value in redis with or without TTL
 * @param {Redis} redis_client  Redis client
 * @param {String} key Key to set value
 * @param {String | Object} value value to be set in cache
 * @param {Number} ttl Optional - Time to live in seconds/ Cache Data expire time in sec
 * @private
 */
const setCacheData = (redis_client, key, value, ttl) => new Promise((resolve, reject) => {
    try {
        const _value = (typeof value === 'string' || value instanceof String) ? value : JSON.stringify(value);
        let args = [key, _value];
        if (ttl) {
            args = [...args, 'EX', ttl]
        }
        redis_client.set(...args, function (err) {
            if (err) {
                return reject(err);
            }
            return resolve(args);
        });
    } catch (error) {
        return reject(error);
    }
});

module.exports = {
    parseStringFromKnexQuery,
    getCacheData,
    setCacheData
}