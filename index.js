const CHILDREN = 'children';
const TEXT_ELEMENT = 'TEXT ELEMENT';

let rootInstance = null;

const render = (element, container) => {
	const prevInstance = rootInstance;
	rootInstance = reconcile(container, prevInstance, element);
};

const reconcile = (parentDom, instance, element) => {
	const newInstance = instantiate(element);

	if (instance == null) {
		parentDom.appendChild(newInstance.dom);
	} else if (element === null) {
		parentDom.removeChild(instance.dom);
		return null;
	} else if (instance.element.type !== element.type) {
		parentDom.replaceChild(newInstance.dom, instance.dom);
		return newInstance;
	} else if (typeof element.type === 'string') {
		updateDomProperties(instance.dom, instance.element.props, element.props);

		instance.childInstances = reconcileChildren(instance, element);
		instance.element = element;

		return instance;
	} else {
		instance.publicInstance.props = element.props;
		const childElement = instance.publicInstance.render();
		const oldChildInstance = instance.childInstances;
		const childInstances = reconcile(parentDom, oldChildInstance, childElement);

		//update dom instances element
		instance.dom = childInstances.dom;
		instance.childInstances = childInstances.childInstances;
		instance.element = childInstances.element;
	}
	return newInstance;
};

const reconcileChildren = (instance, element) => {
	const dom = instance.dom;
	const childInstances = instance.childInstances;
	const nextChildElements = element.props.children ?? [];
	const newChildInstances = [];

	const count = Math.max(childInstances.length, nextChildElements.length);

	for (let i = 0; i < count; i++) {
		const childInstance = childInstances[i];
		const childElement = nextChildElements[i];

		const newChildInstance = reconcile(dom, childInstance, childElement);
		newChildInstances.push(newChildInstance);
	}

	return newChildInstances.filter((instance) => instance);
};

const updateDomProperties = (dom, prevProps, nextProps) => {
	const isEvent = (name) => name.startsWith('on');
	const isAttribute = (name) => !isEvent(name) && name !== CHILDREN;

	const keysProps = Object.keys(prevProps);
	const nextKeysProps = Object.keys(nextProps);

	//remove event and attribute
	keysProps.forEach((name) => {
		if (isEvent(name)) {
			const eventType = name.toLowerCase().substring(2);
			dom.removeEventListener(eventType, prevProps[name]);
		} else if (isAttribute(name)) {
			dom[name] = null;
		}
	});

	nextKeysProps.forEach((name) => {
		if (isEvent(name)) {
			const eventType = name.toLowerCase().substring(2);
			dom.addEventListener(eventType, nextProps[name]);
		} else if (isAttribute(name)) {
			dom[name] = nextProps[name];
		}
	});
};

const instantiate = (element) => {
	const { type, props } = element;
	const isDomElement = typeof type === 'string';

	if (isDomElement) {
		const isTextElement = type === TEXT_ELEMENT;

		const dom = isTextElement
			? document.createTextNode('')
			: document.createElement(type);

		updateDomProperties(dom, [], props);

		const childElements = props.children ?? [];

		const childInstances = childElements.map(instantiate);
		const childNodes = childInstances.map((childInstance) => childInstance.dom);

		childNodes.forEach((childDom) => dom.appendChild(childDom));

		return { dom, element, childInstances };
	} else {
		const instance = {};
		const publicInstance = createPublicInstance(element, instance);

		const childElement = publicInstance.render();
		const childInstance = instantiate(childElement);
		const dom = childInstance.dom;

		Object.assign(instance, { dom, element, childInstance, publicInstance });
		return instance;
	}
};

const createTextElement = (value) => {
	return createElement(TEXT_ELEMENT, { nodeValue: value });
};

const createElement = (type, config, ...args) => {
	const props = { ...config };
	const hasChildren = args?.length > 0;

	const rawChildren = (props.children = hasChildren ? [...args] : []);

	props.children = rawChildren
		.filter((attr) => attr)
		.map((attr) => (attr instanceof Object ? attr : createTextElement(attr)));

	return { type, props };
};

class Component {
	constructor(props) {
		this.props = props;
		this.state = this.state ?? {};
	}

	setState(partialState) {
		this.state = Object.assign({}, this.state, partialState);
		updateInstance(this._internalInstance);
	}
}

const updateInstance = (internalInstance) => {
	const parentDom = internalInstance.dom.parentNode;
	const element = internalInstance.element;

	reconcile(parentDom, internalInstance, element);
};

const createPublicInstance = (element, internalInstance) => {
	const { type, props } = element;
	const publicInstance = new type(props);

	publicInstance._internalInstance = internalInstance;
	return publicInstance;
};

export { render, Component, createElement };
