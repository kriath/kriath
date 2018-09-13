Template.undoToast.events({
	"tap #undoButton": function(event, instance){
		var collection = window[this.collection];
		if (!collection){
			console.warn(
				"Collection with name ",
				this.collection,
				" could not be found"
			);
			return;
		}
		if (collection.restoreNode){
			collection.restoreNode(this.id);
		} else {
			collection.restore(this.id);
		}
	}
});
