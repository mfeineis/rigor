(function (window, factory) {
    "use strict";

    window.Rigor = factory(window, window.document, Object);

}(this, function (window, document, Object) {
    const VERSION = "0.1.0";
    const WELCOME_STINGER = "You are using Rigor@" + VERSION;
    const FRAGMENT_MARKER = "[]";

    const TRACING = false;
    const SUPPORTS_CONSOLE = (function () {
        try {
            console.log.apply(console, [WELCOME_STINGER]);
            return true;
        } catch (_) {
            return false;
        }
    }());

    const Array_isArray = Array.isArray;
    const Array_slice = [].slice;
    const Object_create = Object.create;
    const Object_defineProperty = Object.defineProperty;
    const Object_freeze = Object.freeze;
    const Object_keys = Object.keys;
    const Object_hasOwnProperty = Object.prototype.hasOwnProperty;
    const document_createElement = function createElement(tagName, options) {
        return document.createElement(tagName, options);
    };
    const document_createTextNode = function createTextNode(data) {
        return document.createTextNode(data);
    };
    const window_clearInterval = function clearTimeout(handle) {
        return window.clearInterval(handle);
    };
    const window_clearTimeout = function clearTimeout(handle) {
        return window.clearTimeout(handle);
    };
    const window_setInterval = function setInterval(fn, timeout) {
        return window.setInterval(fn, timeout);
    };
    const window_setTimeout = function setTimeout(fn, timeout) {
        return window.setTimeout(fn, timeout);
    };

    const trace = TRACING && SUPPORTS_CONSOLE ? function trace() {
        console.log.apply(console, ["[TRACE] "].concat(Array_slice.call(arguments)));
    } : function noop() { };

    function forEach(host, fn) {
        host && Object_keys(host).forEach(function (key) {
            fn(host[key], key);
        });
    }

    function exposeSymbol(host, name, value) {
        Object_defineProperty(host, name, {
            configurable: false,
            enumerable: true,
            value: value,
        });
    }

    function mix(to) {
        const froms = Array_slice.call(arguments, 1);

        froms.forEach(function (from) {
            for (let key in from) {
                if (Object_hasOwnProperty.call(from, key)) {
                    to[key] = from[key];
                }
            }
        });

        return to;
    }

    function makeDomRenderer(plugins) {
        return function render(App, root) {
            TRACING && trace("Rigor.render", App, "into", root);

            function mightBeProps(it) {
                return !Array_isArray(it) && typeof it === "object";
            }

            const hasProps = mightBeProps(App[1]);
            const tagName = App[0];
            const state = hasProps ? App[1] : null;
            const children = Array_slice.call(App, hasProps ? 2 : 1);
            let fn;
            let node;

            function syncUpdate(domNode) {
                domNode = domNode || syncUpdate.__node;
                TRACING && trace("syncUpdate", domNode, fn);
                const expr = fn(state, children);
                const hasProps = mightBeProps(expr[1]);
                Array_slice.call(expr, hasProps ? 2 : 1).forEach(function (child) {
                    if (Array_isArray(child)) {
                        TRACING && trace("child.fn", child, "into", domNode);
                        render(child, domNode);
                        // return "[F]";
                    } else {
                        const textNode = document_createTextNode(String(child));
                        domNode.appendChild(textNode);
                    }
                });
            }

            if (!fn) {
                if (typeof tagName === "function") {
                    const api = Object_create(null);
                    forEach(plugins, function (plugin) {
                        const instance = plugin(syncUpdate);
                        forEach(instance, function (prop, exposeAs) {
                            api[exposeAs] = prop;
                        });
                    });
                    fn = tagName(state, Object_freeze(api));
                    TRACING && trace(state, ',', api, '->', fn)
                } else {
                    fn = function (props, cs) {
                        return [tagName, props].concat(cs);
                    };
                }
            }
            const expr = fn(state, children);
            TRACING && trace(state, '->', expr)

            if (expr[0] === FRAGMENT_MARKER) {
                Array_slice.call(expr, 1).map(function (child) {
                    render(child, root);
                });
                return;
            }

            node = document_createElement(expr[0]);
            const exprHasProps = mightBeProps(expr[1]);
            const props = exprHasProps ? expr[1] : null;
            root.appendChild(node);

            syncUpdate.__node = node;

            forEach(props, function (prop, propName) {
                propName.replace(/^class$/, function () {
                    node.classList.add(prop);
                });

                if (/^data$/.test(propName)) {
                    forEach(prop, function (value, key) {
                        node.dataset[key] = value;
                    });
                }

                if (typeof prop === "boolean") {
                    if (prop) {
                        node[propName] = prop;
                    } else {
                        delete node[propName];
                        node["x-" + propName] = prop;
                    }
                }

                propName.replace(/^on(\w+)/, function (_, part) {
                    const eventName = part.toLowerCase();
                    function handler(evt) {
                        // TRACING && trace("handler", key, "(", evt, ")");
                        prop.call(this, evt);
                        syncUpdate(node);
                    }
                    node.addEventListener(eventName, handler);
                });
            });

            syncUpdate(node);
        }
    }

    function makeStringRenderer(plugins) {
        const voidElementLookup = {
            area: true,
            base: true,
            br: true,
            col: true,
            embed: true,
            hr: true,
            img: true,
            input: true,
            link: true,
            meta: true,
            param: true,
            source: true,
            track: true,
            wbr: true,
        };

        function noop() { }

        function mightBeProps(it) {
            return !Array_isArray(it) && typeof it === "object";
        }

        function render(def) {
            TRACING && trace("Rigor.render", def, "as a string");

            if (typeof def === "string") {
                return def;
            }

            if (!Array_isArray(def)) {
                return def;
            }

            if (def.length === 0) {
                return "";
            }

            let expr = def;

            if (typeof def[0] === "function") {
                const hasProps = mightBeProps(def[1]);
                const state = hasProps ? def[1] : null;
                const children = Array_slice.call(def, hasProps ? 2 : 1);

                const api = Object_create(null);
                forEach(plugins, function (plugin) {
                    const instance = plugin(noop);
                    forEach(instance, function (value, exposeAs) {
                        api[exposeAs] = value;
                    });
                });
                const fn = def[0](state, Object_freeze(api));
                TRACING && trace(state, ',', api, '->', fn)

                expr = fn(state, children);
                TRACING && trace(state, '->', expr)
            }

            if (expr[0] === FRAGMENT_MARKER) {
                return Array_slice.call(expr, 1).map(render).join("");
            }

            const hasProps = mightBeProps(expr[1]);
            const props = hasProps ? expr[1] : null;
            const attrs = {};
            forEach(props, function (prop, propName) {
                if (/^on/.test(propName)) {
                    return;
                }

                if (/^data$/.test(propName)) {
                    forEach(prop, function (value, key) {
                        attrs["data-" + key] = value;
                    });
                    return;
                }

                if (typeof prop === "boolean") {
                    if (prop) {
                        attrs[propName] = "";
                    } else {
                        attrs["x-" + propName] = "";
                    }
                    return;
                }

                attrs[propName] = prop;
            });

            const attrsString = Object_keys(attrs).map(function (name) {
                return name + "=\"" + attrs[name] + "\"";
            }).join(" ");

            function thunk(tagName, children) {
                // TRACING && trace("thunk", tagName, attrsString, children);
                const content = children.map(render).join("");
                return "<" + tagName + (attrsString ? " " + attrsString : "") + ">" + content + "</" + tagName + ">";
            }
            // TRACING && trace("pre.thunk.children", Array_slice.call(expr, 2));
            return thunk(expr[0], Array_slice.call(expr, hasProps ? 2 : 1));
        };

        return function renderToStringSync(App) {
            return render(App);
        };
    }

    function ES5ReactiveStatePlugin(notify) {
        return {
            "state": function reactiveState(init) {
                init = init || {};
                const state = {};
                forEach(init, function (value, key) {
                    Object_defineProperty(state, key, {
                        configurable: false,
                        enumerable: true,
                        get: function () {
                            return value;
                        },
                        set: function (newValue) {
                            TRACING && trace("useState.set[", key, "] ", value, "->", newValue);
                            value = newValue;
                            // notify();
                        },
                    });
                });
                return state;
            },
        };
    }

    function BrowserTimersPlugin() {
        return {
            "clearInterval": window_clearInterval,
            "clearTimeout": window_clearTimeout,
            "setInterval": window_setInterval,
            "setTimeout": window_setTimeout,
        };
    }

    function DOMConveniencePlugin() {
        return {
            "fragment": FRAGMENT_MARKER,
        };
    }

    function NativeFetchPlugin() {
        return {
            "fetch": function fetch(input, init) {
                return window.fetch(input, init);
            },
        };
    }

    function ConsoleLoggerPlugin() {
        if (!SUPPORTS_CONSOLE) {
            return {
                "log": function () { },
            };
        }
        return {
            "log": function () {
                console.log.apply(console, arguments);
            },
        };
    }

    function NullLoggerPlugin() {
        return {
            "log": function () { },
        };
    }

    function PubsubPlugin() {
        return {
            "emit": function emit(topic, data) {
                TRACING && trace("pubsub.emit()", topic, data);
                const fullTopic = "topic:" + topic;
                document.dispatchEvent(new CustomEvent(fullTopic, {
                    detail: data,
                }));
            },
            "on": function on(topic, fn) {
                TRACING && trace("pubsub.on()", topic, fn);
                const fullTopic = "topic:" + topic;

                function callback(ev) {
                    fn.call(null, ev.detail);
                }

                document.addEventListener(fullTopic, callback);
                function dispose() {
                    TRACING && trace("pubsub.on().dispose", topic, fn);
                    document.removeEventListener(fullTopic, callback);
                }
                return dispose;
            },
        };
    }

    const safeFlavor = Object_freeze({
        BrowserTimersPlugin: BrowserTimersPlugin,
        DOMConveniencePlugin: DOMConveniencePlugin,
        ES5ReactiveStatePlugin: ES5ReactiveStatePlugin,
        NullLoggerPlugin: NullLoggerPlugin,
    });

    function Rigor(plugins) {
        plugins = plugins || safeFlavor;
        return Object_freeze({
            "DOM": Object_freeze({
                "mount": makeDomRenderer(plugins),
            }),
            "Server": Object_freeze({
                "renderToStringSync": makeStringRenderer(plugins),
            }),
        });
    }
    exposeSymbol(Rigor, "flavors", {
        "modern": Object_freeze({
            BrowserTimersPlugin: BrowserTimersPlugin,
            DOMConveniencePlugin: DOMConveniencePlugin,
            ES5ReactiveStatePlugin: ES5ReactiveStatePlugin,
            NativeFetchPlugin: NativeFetchPlugin,
        }),
        "debug": Object_freeze({
            BrowserTimersPlugin: BrowserTimersPlugin,
            ConsoleLoggerPlugin: ConsoleLoggerPlugin,
            DOMConveniencePlugin: DOMConveniencePlugin,
            ES5ReactiveStatePlugin: ES5ReactiveStatePlugin,
        }),
        "safe": safeFlavor,
    });
    exposeSymbol(Rigor, "DOM", Rigor().DOM);
    exposeSymbol(Rigor, "Server", Rigor().Server);
    exposeSymbol(Rigor, "toString", function toString() {
        return WELCOME_STINGER;
    });
    Rigor["plugins"] = {
        "BrowserTimersPlugin": BrowserTimersPlugin,
        "ConsoleLoggerPlugin": ConsoleLoggerPlugin,
        "DOMConveniencePlugin": DOMConveniencePlugin,
        "ES5ReactiveStatePlugin": ES5ReactiveStatePlugin,
        "NativeFetchPlugin": NativeFetchPlugin,
        "NullLoggerPlugin": NullLoggerPlugin,
        "PubsubPlugin": PubsubPlugin,
    };

    return Object_freeze(Rigor);
}));