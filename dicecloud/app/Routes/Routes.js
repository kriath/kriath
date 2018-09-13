Router.configure({
	loadingTemplate: "loading",
	layoutTemplate: "layout",
	trackPageView: true,
});

Router.plugin("ensureSignedIn", {
	only: [
		"profile",
		"characterList",
	]
});

Router.plugin("dataNotFound", {notFoundTemplate: "notFound"});

var handleSubError = function(e){
	Session.set("error", {reason: e.reason, href: location.href});
	Router.go("/error");
};

Router.map(function() {
	this.route("/", {
		name: "home",
		onAfterAction: function() {
			document.title = appName;
		},
	});

	this.route("characterList", {
		path: "/characterList",
		waitOn: function(){
			return subsManager.subscribe("characterList");
		},
		onAfterAction: function() {
			document.title = appName + " - Characters";
		},
		fastRender: true,
	});

	this.route("characterSheetNaked", {
		path: "/character/:_id/",
		waitOn: function(){
			return [
				subsManager.subscribe(
					"singleCharacter", this.params._id, {onError: handleSubError}
				),
			];
		},
		action: function(){
			var _id = this.params._id
			var character = Characters.findOne(_id);
			var urlName = character && character.urlName;
			var path = `\/character\/${_id}\/${urlName || "-"}`;
			Router.go(path,{},{replaceState:true});
		},
	});

	this.route("characterSheet", {
		path: "/character/:_id/:urlName",
		waitOn: function(){
			return [
				subsManager.subscribe(
					"singleCharacter", this.params._id, {onError: handleSubError}
				),
			];
		},
		data: function() {
			var data = Characters.findOne(
				{_id: this.params._id},
				{fields: {_id: 1, name: 1, color: 1, writers: 1, readers: 1}}
			);
			return data;
		},
		onAfterAction: function() {
			var char = Characters.findOne({_id: this.params._id}, {fields: {name: 1}});
			var name = char && char.name;
			if (name){
				document.title = name;
			}
		},
		//analytics
		trackPageView: false,
		onRun: function() {
			window.ga && window.ga("send", "pageview", "/character");
			this.next();
		},
		fastRender: true,
	});

	this.route("printedCharacterSheet", {
		path: "/character/:_id/:urlName/print",
		waitOn: function(){
			return [
				subsManager.subscribe(
					"singleCharacter", this.params._id, {onError: handleSubError}
				),
			];
		},
		data: function() {
			var data = Characters.findOne(
				{_id: this.params._id},
				{fields: {_id: 1, name: 1, color: 1, writers: 1, readers: 1}}
			);
			return data;
		},
		onAfterAction: function() {
			var char = Characters.findOne({_id: this.params._id}, {fields: {name: 1}});
			var name = char && char.name;
			if (name){
				document.title = name + " - Printing";
			}
		},
		//analytics
		trackPageView: false,
		onRun: function() {
			window.ga && window.ga("send", "pageview", "/print-character");
			this.next();
		},
	});

	this.route("library", {
		path: "/library",
		waitOn: function(){
			return subsManager.subscribe("standardLibraries");
		},
		onAfterAction: function() {
			document.title = appName + " - Library";
		},
		fastRender: true,
	});

	this.route("loading", {
		path: "/loading"
	});

	this.route("profile", {
		path: "/account",
		onAfterAction: function() {
			document.title = appName + " Account";
		},
	});

	this.route("/changelog", {
		name: "changeLog",
		waitOn: function() {
			return [
				subsManager.subscribe("changeLog"),
			]
		},
		data: {
			changeLogs: function() {
				return ChangeLogs.find({}, {sort: {version: -1}});
			}
		},
		onAfterAction: function() {
			document.title = appName;
		},
		fastRender: true,
	});

	this.route("/guide", {
		name: "guide",
		onAfterAction: function() {
			document.title = appName;
		},
	});

	this.route("/error", {
		name: "error",
		onAfterAction: function() {
			document.title = `${appName} - Error`;
		},
	});
});
