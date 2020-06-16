"use strict";

const redis = require('redis');
const md5 = require('md5');
const helpers = require('./helpers');
const promiseTimeout = require('./promise-timeout');

/**
 * 
 * @param {Object} options Redis config
 * @param {String} options.host Redis host, default '127.0.0.1'
 * @param {Number} options.port Redis port, default 6379
 * @private
 */
const initRedisClient = (options) => {
    const { url, auth } = options;
    let redisClient;
    options.port = options.port || 6379;
    options.host = options.host || '127.0.0.1';

    if (!url) {
        redisClient = redis.createClient(options);
    } else {
        redisClient = redis.createClient(url, options);
    }

    if (auth) {
        redisClient.auth(auth);
    }

    return redisClient;
}

/**
 * Generate redis key via knex query object to cache data 
 * @param {Object} knexObj Knex query Object
 * @param {String} cache_key_prefix Cache data prefex key
 * @private
 */
const generateCacheKey = (knexObj, cache_key_prefix) => {
    const query_string = helpers.parseStringFromKnexQuery(knexObj);
    const query_string_hash = md5(query_string);
    return `${cache_key_prefix}:${query_string_hash}`;
}

/**
 * Cache data in redis, trigger error/success events
 * @param {String} cache_key Key to set data
 * @param {Object | String} data Value to be set in cache
 * @param {Number} ttl Optional - Time to live in seconds/ Cache Data expire time in sec
 * @private
 */
function setCacheDataWithEvent(cache_key, data, ttl) {
    helpers.setCacheData(this.redis_client, cache_key, data, ttl)
        .then((args) => {
            this.emit('set-cache-success', args);
        })
        .catch(error => {
            this.emit('set-cache-error', error);
        })
}

/**
 * Get cached data from redis cache with maximum wait time.
 * if function not execute with in timeout or any error while getting data from cache then fire an event.
 * @param {String} cache_key  Key to get value
 * @param {Number} timeoutMillisec Maximum wait time to get data from cache in milliseconds
 * @private
 */
function getCacheDataWithTimeoutEvent(cache_key, timeoutMillisec) {
    return promiseTimeout.timeout(helpers.getCacheData(this.redis_client, cache_key), timeoutMillisec)
        .then(data => data).catch(error => {
            if (error instanceof promiseTimeout.TimeoutError) {
                this.emit('get-cache-error', new Error(`Get data from cache timeout ${timeoutMillisec}ms`));
            } else {
                this.emit('get-cache-error', error);
            }
            return null;
        });
}

/**
 * Validate a knex Object
 * @param {Object} knexObj Knex query Object
 * @private
 */
const validateKnexObject = (knexObj) => {
    //check knex Object is a valid instanceof an Object
    if (!(knexObj instanceof Object)) {
        throw Error('Not a valid Knex Object');
    }
    //check toSQL is a typeof function, toSQL is function in knex object to get raw SQL query and bindings parameters 
    if (typeof knexObj.toSQL !== "function") {
        throw Error('Not a valid Knex Object');
    }

    const toSql = knexObj.toSQL();
    //check toSQL function result is an Object and it has bindings and sql properties
    if (!(toSql instanceof Object && toSql.hasOwnProperty('bindings') && toSql.hasOwnProperty('sql'))) {
        throw Error('Not a valid Knex Object');
    }

    //check bindings and sql data types are valid
    if (!(Array.isArray(toSql.bindings) && typeof toSql.sql === 'string')) {
        throw Error('Not a valid Knex Object');
    }
}
/**
 * Validate a Redis TTL
 * @param {Number} ttl - Time to live in seconds/ Cache Data expire time in sec
 * @private
 */
const validateAndParseTtl = (ttl) => {
    //0 means no ttl
    if (ttl == 0) {
        return null;
    }

    if (!ttl) {
        throw Error('TTL is require. if no ttl then pass "0"');
    } else if (Number(ttl)) {
        return ttl;
    } else {
        throw Error('Not a valid TTL');
    }
}

module.exports = {
    initRedisClient,
    validateKnexObject,
    generateCacheKey,
    getCacheDataWithTimeoutEvent,
    setCacheDataWithEvent,
    validateAndParseTtl
}