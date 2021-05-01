
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.37.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (130:3) {#if today != null}
    function create_if_block(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let h4;
    	let div0_class_value;
    	let t1;
    	let div1;
    	let h2;
    	let t2;
    	let t3_value = /*today*/ ctx[0].status.label + "";
    	let t3;
    	let t4;
    	let ul;
    	let li0;
    	let t5_value = /*today*/ ctx[0].dayName + "";
    	let t5;
    	let t6;
    	let t7_value = /*today*/ ctx[0].day + "";
    	let t7;
    	let t8;
    	let t9_value = /*today*/ ctx[0].month + "";
    	let t9;
    	let t10;
    	let li1;
    	let t11_value = /*today*/ ctx[0].statusText + "";
    	let t11;
    	let t12;
    	let li2;
    	let t13_value = /*today*/ ctx[0].audience + "";
    	let t13;
    	let t14;
    	let a;
    	let button;
    	let t15;
    	let button_class_value;
    	let a_href_value;
    	let div2_class_value;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Today";
    			t1 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			t2 = text("Long Valley is ");
    			t3 = text(t3_value);
    			t4 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t5 = text(t5_value);
    			t6 = space();
    			t7 = text(t7_value);
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			li1 = element("li");
    			t11 = text(t11_value);
    			t12 = space();
    			li2 = element("li");
    			t13 = text(t13_value);
    			t14 = space();
    			a = element("a");
    			button = element("button");
    			t15 = text("Source");
    			attr_dev(h4, "class", "my-0 fw-normal");
    			add_location(h4, file, 133, 6, 3269);

    			attr_dev(div0, "class", div0_class_value = "card-header py-3 " + (/*today*/ ctx[0].status.open
    			? "text-white bg-success border-success"
    			: ""));

    			add_location(div0, file, 132, 4, 3166);
    			attr_dev(h2, "class", "card-title");
    			add_location(h2, file, 137, 6, 3357);
    			add_location(li0, file, 139, 5, 3469);
    			add_location(li1, file, 140, 5, 3525);
    			add_location(li2, file, 141, 5, 3558);
    			attr_dev(ul, "class", "list-unstyled mt-3 mb-4");
    			add_location(ul, file, 138, 6, 3427);
    			attr_dev(button, "type", "button");

    			attr_dev(button, "class", button_class_value = "w-100 btn btn-lg " + (/*today*/ ctx[0].status.open
    			? "btn-success"
    			: "btn-secondary"));

    			add_location(button, file, 144, 7, 3635);
    			attr_dev(a, "href", a_href_value = /*today*/ ctx[0].source);
    			add_location(a, file, 143, 6, 3602);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file, 136, 4, 3327);
    			attr_dev(div2, "class", div2_class_value = "card mb-4 rounded-3 shadow-sm " + (/*today*/ ctx[0].status.open ? "border-success" : ""));
    			add_location(div2, file, 131, 5, 3074);
    			attr_dev(div3, "class", "col");
    			add_location(div3, file, 130, 3, 3051);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h4);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(h2, t2);
    			append_dev(h2, t3);
    			append_dev(div1, t4);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t5);
    			append_dev(li0, t6);
    			append_dev(li0, t7);
    			append_dev(li0, t8);
    			append_dev(li0, t9);
    			append_dev(ul, t10);
    			append_dev(ul, li1);
    			append_dev(li1, t11);
    			append_dev(ul, t12);
    			append_dev(ul, li2);
    			append_dev(li2, t13);
    			append_dev(div1, t14);
    			append_dev(div1, a);
    			append_dev(a, button);
    			append_dev(button, t15);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*today*/ 1 && div0_class_value !== (div0_class_value = "card-header py-3 " + (/*today*/ ctx[0].status.open
    			? "text-white bg-success border-success"
    			: ""))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*today*/ 1 && t3_value !== (t3_value = /*today*/ ctx[0].status.label + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*today*/ 1 && t5_value !== (t5_value = /*today*/ ctx[0].dayName + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*today*/ 1 && t7_value !== (t7_value = /*today*/ ctx[0].day + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*today*/ 1 && t9_value !== (t9_value = /*today*/ ctx[0].month + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*today*/ 1 && t11_value !== (t11_value = /*today*/ ctx[0].statusText + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*today*/ 1 && t13_value !== (t13_value = /*today*/ ctx[0].audience + "")) set_data_dev(t13, t13_value);

    			if (dirty & /*today*/ 1 && button_class_value !== (button_class_value = "w-100 btn btn-lg " + (/*today*/ ctx[0].status.open
    			? "btn-success"
    			: "btn-secondary"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*today*/ 1 && a_href_value !== (a_href_value = /*today*/ ctx[0].source)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*today*/ 1 && div2_class_value !== (div2_class_value = "card mb-4 rounded-3 shadow-sm " + (/*today*/ ctx[0].status.open ? "border-success" : ""))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(130:3) {#if today != null}",
    		ctx
    	});

    	return block;
    }

    // (158:3) {#each nextSevenDays as day}
    function create_each_block(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let h50;
    	let t0_value = /*day*/ ctx[3].dayName + "";
    	let t0;
    	let t1;
    	let t2_value = /*day*/ ctx[3].day + "";
    	let t2;
    	let t3;
    	let t4_value = /*day*/ ctx[3].month + "";
    	let t4;
    	let div0_class_value;
    	let t5;
    	let div1;
    	let h51;
    	let t6_value = /*day*/ ctx[3].status.label + "";
    	let t6;
    	let t7;
    	let ul;
    	let li0;
    	let t8_value = /*day*/ ctx[3].statusText + "";
    	let t8;
    	let t9;
    	let li1;
    	let t10_value = /*day*/ ctx[3].audience + "";
    	let t10;
    	let t11;
    	let a;
    	let button;
    	let t12;
    	let button_class_value;
    	let a_href_value;
    	let div2_class_value;
    	let t13;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			h51 = element("h5");
    			t6 = text(t6_value);
    			t7 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t8 = text(t8_value);
    			t9 = space();
    			li1 = element("li");
    			t10 = text(t10_value);
    			t11 = space();
    			a = element("a");
    			button = element("button");
    			t12 = text("Source");
    			t13 = space();
    			attr_dev(h50, "class", "my-0 fw-normal");
    			add_location(h50, file, 161, 6, 4287);

    			attr_dev(div0, "class", div0_class_value = "card-header py-3 " + (/*day*/ ctx[3].status.open
    			? "text-white bg-success border-success"
    			: ""));

    			add_location(div0, file, 160, 5, 4186);
    			attr_dev(h51, "class", "card-title");
    			add_location(h51, file, 165, 6, 4408);
    			add_location(li0, file, 167, 6, 4504);
    			add_location(li1, file, 168, 6, 4536);
    			attr_dev(ul, "class", "list-unstyled mt-3 mb-4");
    			add_location(ul, file, 166, 6, 4461);
    			attr_dev(button, "type", "button");

    			attr_dev(button, "class", button_class_value = "w-100 btn btn-lg " + (/*day*/ ctx[3].status.open
    			? "btn-success"
    			: "btn-secondary"));

    			add_location(button, file, 171, 7, 4609);
    			attr_dev(a, "href", a_href_value = /*day*/ ctx[3].source);
    			add_location(a, file, 170, 6, 4578);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file, 164, 5, 4378);
    			attr_dev(div2, "class", div2_class_value = "card mb-4 rounded-3 shadow-sm " + (/*day*/ ctx[3].status.open ? "border-success" : ""));
    			add_location(div2, file, 159, 5, 4095);
    			attr_dev(div3, "class", "col");
    			add_location(div3, file, 158, 4, 4072);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h50);
    			append_dev(h50, t0);
    			append_dev(h50, t1);
    			append_dev(h50, t2);
    			append_dev(h50, t3);
    			append_dev(h50, t4);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, h51);
    			append_dev(h51, t6);
    			append_dev(div1, t7);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(li0, t8);
    			append_dev(ul, t9);
    			append_dev(ul, li1);
    			append_dev(li1, t10);
    			append_dev(div1, t11);
    			append_dev(div1, a);
    			append_dev(a, button);
    			append_dev(button, t12);
    			append_dev(div3, t13);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*nextSevenDays*/ 2 && t0_value !== (t0_value = /*day*/ ctx[3].dayName + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*nextSevenDays*/ 2 && t2_value !== (t2_value = /*day*/ ctx[3].day + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*nextSevenDays*/ 2 && t4_value !== (t4_value = /*day*/ ctx[3].month + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*nextSevenDays*/ 2 && div0_class_value !== (div0_class_value = "card-header py-3 " + (/*day*/ ctx[3].status.open
    			? "text-white bg-success border-success"
    			: ""))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*nextSevenDays*/ 2 && t6_value !== (t6_value = /*day*/ ctx[3].status.label + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*nextSevenDays*/ 2 && t8_value !== (t8_value = /*day*/ ctx[3].statusText + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*nextSevenDays*/ 2 && t10_value !== (t10_value = /*day*/ ctx[3].audience + "")) set_data_dev(t10, t10_value);

    			if (dirty & /*nextSevenDays*/ 2 && button_class_value !== (button_class_value = "w-100 btn btn-lg " + (/*day*/ ctx[3].status.open
    			? "btn-success"
    			: "btn-secondary"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*nextSevenDays*/ 2 && a_href_value !== (a_href_value = /*day*/ ctx[3].source)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*nextSevenDays*/ 2 && div2_class_value !== (div2_class_value = "card mb-4 rounded-3 shadow-sm " + (/*day*/ ctx[3].status.open ? "border-success" : ""))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(158:3) {#each nextSevenDays as day}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main1;
    	let div6;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let main0;
    	let div1;
    	let t1;
    	let div2;
    	let p;
    	let t3;
    	let div3;
    	let t4;
    	let footer;
    	let div5;
    	let div4;
    	let h4;
    	let t6;
    	let small;
    	let if_block = /*today*/ ctx[0] != null && create_if_block(ctx);
    	let each_value = /*nextSevenDays*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main1 = element("main");
    			div6 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			main0 = element("main");
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "Next seven days";
    			t3 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			footer = element("footer");
    			div5 = element("div");
    			div4 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Braking Dads";
    			t6 = space();
    			small = element("small");
    			small.textContent = "© 2021";
    			attr_dev(img, "id", "logo");
    			attr_dev(img, "width", "200");
    			attr_dev(img, "height", "200");
    			attr_dev(img, "alt", "Braking Dads Logo");
    			if (img.src !== (img_src_value = "/img/braking-dads-logo.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-19msf4s");
    			add_location(img, file, 124, 4, 2816);
    			attr_dev(div0, "class", "header p-3 pb-md-4 mx-auto text-center");
    			add_location(div0, file, 123, 2, 2759);
    			attr_dev(div1, "class", "row row-cols-1 row-cols-md-3 mb-3 text-center justify-content-center");
    			add_location(div1, file, 128, 4, 2942);
    			attr_dev(p, "class", "fs-5 text-muted");
    			add_location(p, file, 153, 5, 3890);
    			attr_dev(div2, "class", "seven-days header p-3 pb-md-4 mx-auto text-center svelte-19msf4s");
    			add_location(div2, file, 152, 4, 3821);
    			attr_dev(div3, "class", "row row-cols-7 row-cols-md-4 mb-4 text-center justify-content-center");
    			add_location(div3, file, 156, 4, 3953);
    			add_location(h4, file, 184, 5, 4908);
    			attr_dev(small, "class", "d-block mb-3 text-muted");
    			add_location(small, file, 185, 5, 4935);
    			attr_dev(div4, "class", "col-12 col-md");
    			add_location(div4, file, 183, 3, 4875);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file, 182, 4, 4854);
    			attr_dev(footer, "class", "pt-4 my-md-5 pt-md-5 border-top");
    			add_location(footer, file, 181, 2, 4801);
    			add_location(main0, file, 127, 2, 2931);
    			attr_dev(div6, "class", "container py-3");
    			add_location(div6, file, 122, 1, 2725);
    			add_location(main1, file, 121, 0, 2717);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main1, anchor);
    			append_dev(main1, div6);
    			append_dev(div6, div0);
    			append_dev(div0, img);
    			append_dev(div6, t0);
    			append_dev(div6, main0);
    			append_dev(main0, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(main0, t1);
    			append_dev(main0, div2);
    			append_dev(div2, p);
    			append_dev(main0, t3);
    			append_dev(main0, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			append_dev(main0, t4);
    			append_dev(main0, footer);
    			append_dev(footer, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h4);
    			append_dev(div4, t6);
    			append_dev(div4, small);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*today*/ ctx[0] != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*nextSevenDays*/ 2) {
    				each_value = /*nextSevenDays*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main1);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getOpeningTimesForDate(date, openingTimes) {
    	const month = date.toLocaleString("default", { month: "long" }).toLowerCase();
    	const dayName = date.toLocaleDateString("default", { weekday: "short" });
    	const day = "" + date.getDate();
    	const year = "" + date.getFullYear();
    	const monthData = openingTimes[month];

    	if (monthData == null) {
    		return errorOpeningTimes(year, month, day);
    	}

    	const dayData = monthData.times[day];

    	if (dayData == null) {
    		return errorOpeningTimes(year, month, day);
    	}

    	return {
    		source: monthData.source,
    		day,
    		dayName,
    		month: capitalize(month),
    		statusText: dayData.openStatus,
    		status: refineOpenStatus(dayData.openStatus),
    		audience: dayData.audience
    	};
    }

    function refineOpenStatus(text) {
    	const closedUntil = text.match(/^closed.*until[^0-9]*([0-9\.]+)(pm|am)?.*$/i);

    	if (closedUntil != null) {
    		return {
    			open: true,
    			label: "Open After " + closedUntil[1] + amPm(closedUntil[2])
    		};
    	}

    	const closedFrom = text.match(/^closed.*from[^0-9]*([0-9\.]+)(pm|am)?.*$/i);

    	if (closedFrom != null) {
    		return {
    			open: false,
    			label: "Closed From " + closedFrom[1] + amPm(closedFrom[2])
    		};
    	}

    	const closedBetween = text.match(/^closed[^0-9]*([0-9\.]+)(pm|am)?.*to[^0-9]+([0-9\.]+)(pm|am)?.*$/i);

    	if (closedBetween != null) {
    		return {
    			open: true,
    			label: "Open After " + closedBetween[3] + amPm(closedBetween[4])
    		};
    	}

    	const closed = text.match(/^.*open.*$/i);

    	if (closed != null) {
    		return { open: true, label: "Open" };
    	}

    	return { open: false, label: "Closed" };
    }

    function capitalize(s) {
    	return s && s[0].toUpperCase() + s.slice(1);
    }

    function amPm(text) {
    	if (text == null) {
    		return "";
    	} else {
    		return text.toUpperCase();
    	}
    }

    function errorOpeningTimes(year, month, day) {
    	return {
    		source: "https://www.gov.uk/government/publications/south-east-training-estate-firing-times/aldershot-training-area-closure-times-" + month + "-" + year,
    		day,
    		month,
    		openStatus: "???",
    		audience: ""
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { today } = $$props;
    	let { nextSevenDays = [] } = $$props;

    	async function getOpeningTimes() {
    		const res = await fetch("data/opening-times.json", { method: "GET" });
    		const openingTimes = await res.json();
    		const now = new Date();
    		$$invalidate(0, today = getOpeningTimesForDate(now, openingTimes));
    		const newDays = [];

    		for (let i = 1; i <= 7; i++) {
    			now.setDate(now.getDate() + 1);
    			const futureOpeningTimes = getOpeningTimesForDate(now, openingTimes);
    			newDays.push(futureOpeningTimes);
    		}

    		$$invalidate(1, nextSevenDays = newDays);
    		console.log(nextSevenDays);
    	}

    	
    	getOpeningTimes();
    	const writable_props = ["today", "nextSevenDays"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("today" in $$props) $$invalidate(0, today = $$props.today);
    		if ("nextSevenDays" in $$props) $$invalidate(1, nextSevenDays = $$props.nextSevenDays);
    	};

    	$$self.$capture_state = () => ({
    		today,
    		nextSevenDays,
    		getOpeningTimes,
    		getOpeningTimesForDate,
    		refineOpenStatus,
    		capitalize,
    		amPm,
    		errorOpeningTimes
    	});

    	$$self.$inject_state = $$props => {
    		if ("today" in $$props) $$invalidate(0, today = $$props.today);
    		if ("nextSevenDays" in $$props) $$invalidate(1, nextSevenDays = $$props.nextSevenDays);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [today, nextSevenDays];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { today: 0, nextSevenDays: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*today*/ ctx[0] === undefined && !("today" in props)) {
    			console_1.warn("<App> was created without expected prop 'today'");
    		}
    	}

    	get today() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set today(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nextSevenDays() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nextSevenDays(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
