
function createTestHarness(configureBridge, exports) {
    "use strict";
    exports = exports || {};

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function pretty(it) {
        return JSON.stringify(it);
    }

    const Array_slice = [].slice;

    const bridge = configureBridge({
        escapeHtml: escapeHtml,
        // pretty: pretty,
        // slice: Array_slice,
    });

    const frames = [];
    let buffer = [];

    function cleanError(error) {
        const toBeRemoved = [
            /at Object.toBe \(|toBe/,
            /at Object.toBeDefined \(|toBeDefined/,
            /at Object.toEqual \(|toEqual/,
            /at it \(|it/,
            /at describe \(|describe/,
        ];
        if (error.stack) {
            error.stack = error.stack.split("\n").filter(function (line) {
                return !toBeRemoved.some(function (rule) {
                    return rule.test(line);
                });
            }).join("\n");
        }
        return error;
    }

    function fail(what, e) {
        buffer.push([
            frames.length,
            "❌ " + what + " --- " + e,
            what,
            cleanError(e),
        ]);
    }

    function pass(what) {
        const msg = "✔ " + what;
        buffer.push([
            frames.length,
            msg,
            msg,
        ]);
    }

    exports.describe = function describe(what, fn) {
        const msg = "📋 " + what;
        frames.push([]);
        const level = frames.length;
        const sectionHeader = [
            level,
            msg,
            msg,
        ];

        try {
            buffer.push(sectionHeader);
            fn();
        } catch (e) {
            sectionHeader.push(cleanError(e));
        } finally {
            if (level === 1) {
                const hasError = buffer.reduce(function (yep, it) {
                    return yep || it[3] instanceof Error;
                }, false);
                if (hasError) {
                    sectionHeader.push(cleanError(new Error()));
                }
                bridge.flush(buffer);
                buffer = [];
            }
            frames.pop();
        }
    };

    exports.it = function it(what, fn) {
        try {
            fn();
            pass(what);
        } catch (e) {
            fail(what, e);
        }
    };

    exports.expect = function expect(it, msg) {
        return {
            toBe: function toBe(expected) {
                if (it !== expected) {
                    throw new Error(msg || (pretty(it) + " should be strictly equal to " + pretty(expected)));
                }
            },
            toBeDefined: function toBeDefined() {
                if (typeof it === "undefined") {
                    throw new Error(msg || (pretty(it) + " should be defined."));
                }
            },
            toEqual: function (expected) {
                if (JSON.stringify(it) !== JSON.stringify(expected)) {
                    throw new Error(msg || (pretty(it) + " should be equal to " + pretty(expected)));
                }
            },
            //toBeTruthy
            //toBeFalsy
            //toBeNull
            //not
            //toHaveLength
            //toThrow
            //toContain
            not: {
                toBe: function toBe(expected) {
                    if (!(it !== expected)) {
                        throw new Error(msg || (pretty(it) + " should not be strictly equal to " + pretty(expected)));
                    }
                },
                toBeDefined: function toBeDefined() {
                    if (!(typeof it === "undefined")) {
                        throw new Error(msg || (pretty(it) + " should not be defined."));
                    }
                },
                toEqual: function (expected) {
                    if (JSON.stringify(it) === JSON.stringify(expected)) {
                        throw new Error(msg || (pretty(it) + " should not be equal to " + pretty(expected)));
                    }
                },
            },
        };
    };

    exports.jest = {
        fn: function fn(impl) {
            impl = impl || function () { };

            function mocked() {
                mocked.mock.calls.push(Array_slice.call(arguments));
                const result = impl.apply(this, arguments);
                mocked.mock.results.push(result);
                return result;
            }
            mocked.mock = {
                calls: [],
                results: [],
            };

            return mocked;
        },
    };

    return exports;
}