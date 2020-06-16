'use strict';

/**
 * Timeout error
 */
class TimeoutError extends Error {
    constructor() {
        super('Timeout');
        this.name = 'TimeoutError';
    }
}

/**
 * Timeout promise
 * @param {Number} timeoutMillisec Number of milliseconds, Maximum wait to resolve/reject promise
 * @param {Object} self local object of timeout method
 * @private
 */
function timeoutPromise(timeoutMillisec, self) {
    return new Promise((resolve, reject) => {
        self.timeout = setTimeout(reject, timeoutMillisec, new this.TimeoutError());
    })
}
/**
 * PromiseTimeout
 * Execute promise with timeout
 */
class PromiseTimeout {
    constructor() {
        this.TimeoutError = TimeoutError;
    }
    /**
     * Reject a promise {@link TimeoutError} if it does not resolve within timeoutMillisec
     * timeout method to execute promise 
     * @param {Promise} promise promises
     * @param {Number} timeoutMillisec Number of milliseconds, Maximum wait to resolve/reject promise
     */
    timeout(promise, timeoutMillisec) {
        const self = {
            timeout: null
        };
        return Promise.race([promise, timeoutPromise.bind(this)(timeoutMillisec, self)])
            .then(result => {
                clearTimeout(self.timeout);
                return result;
            }).catch(err => {
                clearTimeout(self.timeout);
                throw err;
            })
    }
}

module.exports = new PromiseTimeout();