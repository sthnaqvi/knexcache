"use strict";

const { EventEmitter } = require('events');
const utils = require('./utils');

/**
 * Events and Redis based caching service for Knex
 */
class KnexCache extends EventEmitter {
    /**
     * KnexCache constructor
     * @param {Object} options Redis and KnexCache configration
     * @param {String} options.host Redis host, default '127.0.0.1'
     * @param {Number} options.port Redis port, default 6379
     * @param {String} options.cache_key_prefix Cache data prefex key, default knex
     */
    constructor(options = {}) {
        super();
        //creates redis connestion;
        this.redis_client = utils.initRedisClient(options);
        this.cache_key_prefix = options.cache_key_prefix || 'knex'
    }
    /**
     * Cache any knex query result with or without TTL in redis
     * @param {Object} query Knex query Object
     * @param {Number} ttl Redis Time to live in seconds/ Cache Data expire time in sec, Set 0 if no TTl
     * @param {Number} timeoutMillisec Optional - Maximum wait time to get data from cache in milliseconds Defalut 10000 ms (10 secs)
     */
    async cache(query, ttl, timeoutMillisec = 10000) {
        utils.validateKnexObject(query);
        ttl = utils.validateAndParseTtl(ttl);
        const cache_key = utils.generateCacheKey(query, this.cache_key_prefix);
        //TODO: error and timeout handle while getting cache data
        const cache_data = await utils.getCacheDataWithTimeoutEvent.bind(this)(cache_key, timeoutMillisec);
        if (cache_data) {
            //do something with success event
            this.emit('get-cache-success', '');
            return cache_data;
        }
        const data = await query;
        utils.setCacheDataWithEvent.bind(this)(cache_key, data, ttl)
        return data
    }
}

module.exports = KnexCache;