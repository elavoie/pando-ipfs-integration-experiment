module.exports = function promisify(context) {
    function promisifyMethod(method) {
        return function () {
            const args = Array.prototype.slice.call(arguments);
            const lastIndex = args.length - 1;
            const lastArg = args && args.length > 0 ? args[lastIndex] : null;
            const cb = typeof lastArg === 'function' ? lastArg : null;

            if (cb) {
                return method.apply(context, args);
            }

            return new Promise((resolve, reject) => {
                args.push((err, val) => {
                    if (err) return reject(err);
                    resolve(val);
                });

                method.apply(context, args);
            });
        }
    }

    Object.keys(context)
    .filter((k) => typeof context[k] === 'function')
    .forEach((k) => {
        context[k] = promisifyMethod(context[k])
    })

    return context
}

module.exports['function'] = function promisifyFunction(fn) {
    context = null
    return function () {
        const args = Array.prototype.slice.call(arguments);
        const lastIndex = args.length - 1;
        const lastArg = args && args.length > 0 ? args[lastIndex] : null;
        const cb = typeof lastArg === 'function' ? lastArg : null;

        if (cb) {
            return fn.apply(context, args);
        }

        return new Promise((resolve, reject) => {
            args.push((err, val) => {
                if (err) return reject(err);
                resolve(val);
            });

            fn.apply(context, args);
        });
    }
}

