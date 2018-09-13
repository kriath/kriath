dialogs = new ReactiveArray();
const offset = 16;
const duration = 400;

pushDialogStack = function({template, data, element, returnElement, callback}){
	// Generate a new _id so that Blaze knows how to shuffle the array
	const _id = Random.id();
	dialogs.push({
		_id,
		template,
		data,
		element,
		returnElement,
		callback,
	});

	updateHistory();
};

var currentResult;

popDialogStack = function(result){
	if (history && history.state && history.state.openDialogs){
		currentResult = result;
		history.back();
	} else {
		popDialogStackAction(result);
	}
}

window.onpopstate = function(event){
	let state = event.state;
	let numDialogs = dialogs._array.length;
	if (_.isFinite(state.openDialogs) && numDialogs > state.openDialogs){
		popDialogStackAction(currentResult);
		currentResult = undefined;
	}
}

popDialogStackAction = function(result){
	const dialog = dialogs.pop();
	updateHistory();
	if (!dialog) return;
	dialog.callback && dialog.callback(result);
};

let updateHistory = function(){
	// history should looks like: [{openDialogs: 0}, {openDialogs: n}] where
	// n is the number of open dialogs

	// If we can't access the history object, give up
	if (!history) return;
	// Make sure that there is a state tracking open dialogs
	// replace the state without bashing it in the process
	if (!history.state || !_.isFinite(history.state.openDialogs)){
		let newState = _.clone(history.state)  || {};
		newState.openDialogs = 0;
		history.replaceState(newState, "");
	}

	const numDialogs = dialogs._array.length;
	const stateDialogs = history.state.openDialogs;

	// If the number of dialogs and state dialogs are equal, we don't need to do
	// anything
	if (numDialogs === stateDialogs) return;

	if (stateDialogs > 0){
		// On a dialog count
		if (numDialogs === 0){
			// but shouldn't be
			history.back();
		} else {
			// but should replace with correct count
			let newState = _.clone(history.state) || {};
			newState.openDialogs = dialogs._array.length;
			history.replaceState(newState, "");
		}
	} else if (numDialogs > 0 && stateDialogs === 0){
		// On the zero state, push a dialog count
		history.pushState({openDialogs: numDialogs}, "");
	} else {
		console.warn(
			"History could not be updated correctly, unexpected case",
			{stateDialogs, numDialogs},
		)
	}
};

Template.dialogStack.helpers({
	dialogStackClass(){
		if (!dialogs.get().length) return "hide";
	},
	dialogs(){
		return dialogs.get();
	},
	dialogStyle(index){
		const length = dialogs.get().length;
		if (index >= length) return;
		const num = length - 1;
		const left = (num - index) * -offset;
		const top =  (num - index) * -offset;
		return `left:${left}px; top:${top}px;`;
	},
});

Template.dialogStack.events({
	"click .dialog-stack .backdrop": function(event){
		if (event.target === event.currentTarget) popDialogStack();
	},
});

// Only supports border radius defined like "20px" or "100%"
const transformedRadius = (radiusString, deltaWidth, deltaHeight) => {
	if (/^\d+\.?\d*px$/.test(radiusString)){
		//The radius is defined in pixel units, so get the radius as a number
		const rad = +radiusString.match(/\d+\.?\d*/)[0];
		// Set the x and y radius of the "to" element, compensating for scale
		return `${rad / deltaWidth}px / ${rad / deltaHeight}px`;
	} else if (/^\d+\.?\d*%$/.test(radiusString)) {
		//The radius is defined as a percentage, so just use it as is
		return radiusString;
	}
};

const imitate = (
	element, source, deltaLeft, deltaTop, deltaWidth, deltaHeight
) => {
	element.style.transform = `translate(${deltaLeft}px, ${deltaTop}px) ` +
		`scale(${deltaWidth}, ${deltaHeight})`;
	element.style.background = $(source).css("background");
	// Imitate the border radius after transform
	const border = $(source).css("border-radius")
	const rad = transformedRadius(border, deltaWidth, deltaHeight);
	element.style.borderRadius = rad
}

const shrinkAnimation = ({element, reverse}) => {
	element.css({
		transform: reverse ? "scale(0) translateZ(0)" : "",
	});
	const fraction = duration / 4;
	_.defer(() => element.css({
		transition: reverse ?
			`transform ${fraction}ms ease ${duration - fraction}ms` :
			`transform ${fraction}ms ease`
		,
		transform: reverse ? "" : "scale(0) translateZ(0)",
	}));
	_.delay(() => element.css({
		transition: "",
	}), duration);
}

const dialogOpenAnimation = ({element, returnElement, dialog}) => {
	// hide all floaty buttons when we open the first dialog
	let fabs = $(".mini-holder paper-fab, .floatyButton").filter(
		(index, el) => el !== element && el !== returnElement
	);
	if (dialogs._array.length === 1) {
		shrinkAnimation({element: fabs});
	}

	const dialogRect = dialog.getBoundingClientRect();
	const elementRect = element.getBoundingClientRect();
	element.style.visibility = "hidden";
	returnElement = _.isFunction(returnElement) ? returnElement() : returnElement;
	if (returnElement) returnElement.style.visibility = "hidden";
	// Get how must the element change to become the dialog
	const deltaLeft = elementRect.left - dialogRect.left;
	const deltaTop = elementRect.top - dialogRect.top;
	const deltaWidth = elementRect.width / dialogRect.width;
	const deltaHeight = elementRect.height / dialogRect.height;

	// Make the dialog imitate the element, immediately
	dialog.style.transition = "none";
	imitate(dialog, element, deltaLeft, deltaTop, deltaWidth, deltaHeight);

	_.defer(() => {
		// Next frame, undo the imitation, let dialog animate back into place
		dialog.style.transition = `all ${duration}ms ease`;
		dialog.style.transform = "";
		dialog.style.borderRadius = "";
		dialog.style.background = "";
	});
	// Clean up after the animation is done and call our callback
	_.delay(() => {
		dialog.style.transition = "";
	}, duration);
}

const dialogCloseAnimation = ({element, returnElement, dialog, callback}) => {
	// unhide all floaty buttons when we close the last dialog
	let fabs = $(".mini-holder paper-fab, .floatyButton").filter(
		(index, el) => el !== element && el !== returnElement
	);
	if (dialogs._array.length === 0) {
		shrinkAnimation({element: fabs, reverse: true});
	}

	// We are returning to a different element
	// pop the original element back in and use the returnElement in its place
	returnElement = _.isFunction(returnElement) ? returnElement() : returnElement;
	if (returnElement && returnElement !== element){
		let originalElement = element;
		element = returnElement;
		originalElement.style.transition = "";
		originalElement.style.visibility = "";
		originalElement.style.transform = "scale(0) translateZ(0px)";
		_.defer(() => {
			originalElement.style.transition = `transform ${duration}ms ease`;
			originalElement.style.transform = "";
		});
		_.delay(() => {
			originalElement.style.transition = "";
		}, duration);
	}
	// Reset the dialog if it is mid-transition
	dialog.style.transition = "none";
	dialog.style.transform = "none";
	dialog.style.borderRadius = "";
	dialog.style.background = "";
	dialog.style.opacity = "1";
	// Get the original bounding rectangles of both elements
	const dialogRect = dialog.getBoundingClientRect();
	const elementRect = element.getBoundingClientRect();

	// Set up a clone of the original element
	// This lets us have a fixed position element which isn't clipped
	clone = element.cloneNode(true);
	clone.style.position = "fixed";
	clone.style.top = 0;
	clone.style.left = 0;
	clone.style.width = elementRect.width + "px";
	clone.style.height = elementRect.height + "px";
	clone.style.visibility = "";
	clone.style.zIndex = 2;

	// Compensate for stack moving at the same time if we are many dialogs deep
	const stackCompensation = dialogs._array.length ? 16 : 0;

	// Insert clone before its progenitor so it can inherit css correctly
	element.parentNode && element.parentNode.insertBefore(clone, element);

	// Polymer messes up fixed positioning, measure and compensate
	startingRect = clone.getBoundingClientRect();
	clone.style.top = (elementRect.top - startingRect.top + stackCompensation) +
						"px";
	clone.style.left = (elementRect.left - startingRect.left + stackCompensation) +
						"px";

	// How must the original dialog change to become the element
	const deltaLeft = dialogRect.left - elementRect.left - stackCompensation;
	const deltaTop = dialogRect.top - elementRect.top - stackCompensation;
	const deltaWidth = dialogRect.width / elementRect.width;
	const deltaHeight = dialogRect.height / elementRect.height;

	// Make the clone imitate the dialog
	clone.style.transition = "none";
	clone.style.transformOrigin = "top left"
	imitate(clone, dialog, deltaLeft, deltaTop, deltaWidth, deltaHeight);

	_.defer(() => {
		// Next frame, undo the imitation, let clone animate into its place
		clone.style.transition = `all ${duration}ms ease`;
		clone.style.transform = "";
		clone.style.borderRadius = "";
		clone.style.background = "";
		// Make the dialog follow the clone in and fade away
		dialog.style.transition = `all ${duration}ms ease, ` +
									`opacity ${duration / 2}ms linear`;
		dialog.style.opacity = 0;
		imitate(dialog, element, -deltaLeft,
			-deltaTop, 1 / deltaWidth, 1 / deltaHeight);
	});
	// Clean up after the animation is done and call our callback
	_.delay(() => {
		element.style.visibility = "";
		clone.remove();
		if (callback) callback();
	}, duration);
};

Template.dialogStack.onRendered(function(){
	$(".dialog-sizer")[0]._uihooks = {
		insertElement: function(node, next) {
			$(node).insertBefore(next);
			const data = Blaze.getData(node);
			if (data.element){
				// Store the reference to the element on the DOM node itself,
				// since Blaze won't keep the data around for the remove hook
				node._dialogStackElement = data.element;
				node._dialogStackReturnElement = data.returnElement;
				dialogOpenAnimation({
					element: data.element,
					returnElement: data.returnElement,
					dialog: node,
				});
			}
		},
		removeElement: function(node) {
			const element = node._dialogStackElement;
			const returnElement = node._dialogStackReturnElement;
			if (element){
				dialogCloseAnimation({
					element,
					returnElement,
					dialog: node,
					callback(){
						node.remove();
					},
				});
			} else {
				node.remove();
			}
		},
	}
});

Template.testDialog.events({
	"click .testButton": function(event, template){
		pushDialogStack({
			template: "testDialog",
			element: event.currentTarget,
			data: Random.id(),
		});
	},
})
