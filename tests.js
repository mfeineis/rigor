
function tests(suts, harness) {
    const describe = harness.describe;
    const it = harness.it;
    const expect = harness.expect;
    const jest = harness.jest;

    const Rigor = suts.Rigor;
    const renderToStringSync = Rigor.Server.renderToStringSync;
    const GodspeedYou = suts.GodspeedYou;
    const Stateful = suts.Stateful;

    describe("The Test Harness", function () {

        it("should provide 'describe', 'it', 'expect' and 'jest'", function () {
            expect(typeof describe).toBe("function");
            expect(typeof it).toBe("function");
            expect(typeof expect).toBe("function");
            expect(jest).toBeDefined();
        });

    });

    function createSandbox(overrides) {
        const sandbox = [
            [Rigor.plugins.BrowserTimersPlugin, []],
            [Rigor.plugins.DOMConveniencePlugin, []],
            [Rigor.plugins.ES5ReactiveStatePlugin, [function notify() { }]],
            [Rigor.plugins.ConsoleLoggerPlugin, []],
        ].reduce(function (partial, expr) {
            const plugin = expr[0].apply(null, expr[1]);
            Object.keys(plugin).forEach(function (key) {
                partial[key] = plugin[key];
            });
            return partial;
        }, {
            fragment: "",
            log: function () { },
            setTimeout: function (fn, ms) { },
            state: function (init) { },
        });

        Object.keys(overrides || {}).forEach(function (key) {
            sandbox[key] = overrides[key];
        });
        return sandbox;
    }

    describe("GodspeedYou", function () {

        it("should be defined", function () {
            expect(GodspeedYou).toBeDefined();
        });

        it("should be a function", function () {
            expect(typeof GodspeedYou).toBe("function");
        });

        it("should return a render function that accepts only 'props'", function () {
            const render = GodspeedYou();
            expect(typeof render).toBe("function");
            expect(render.length).toBe(1);
        });

        describe("the produced render function", function () {

            it("should greet appropriately", function () {
                const render = GodspeedYou();
                expect(render({ who: "Black Emperor" })).toEqual(["b", "Godspeed you, Black Emperor!"])
            });

        });

    });

    describe("Stateful", function () {

        it("should be a function with 2 parameters", function () {
            expect(typeof Stateful).toBe("function");
            expect(Stateful.length).toBe(2);
        });

        describe("the produced render function", function () {

            it("should close over local state with default values", function () {
                const state = jest.fn();
                const render = Stateful({}, createSandbox({
                    state: state,
                }));

                expect(typeof render).toBe("function");
                expect(render.length).toBe(2);
                expect(state.mock.calls).toEqual([
                    [{ count: 0 }],
                ]);
            });

            it("should match a known static expression snapshot", function () {
                const props = {
                    count: 23,
                };
                const R = createSandbox();
                const render = Stateful(props, R);

                expect(render(props, [])).toEqual(
                    [R.fragment,
                    ["button", { class: "btn", data: { bla: "blubb" }, disabled: false },
                        "Click Me! (", 23, ",", 42, ")",
                    ]
                    ]
                );
            });

            it("should match a known static HTML snapshot", function () {
                const props = {
                    count: 23,
                };

                expect(renderToStringSync([Stateful, props])).toEqual([
                    '<button class="btn" data-bla="blubb" x-disabled="">',
                    'Click Me! (23,42)',
                    '</button>',
                ].join(""));
            });

        });

    })
}