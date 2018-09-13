Libraries = new Mongo.Collection("library");

Schemas.Library = new SimpleSchema({
	name:    {type: String},
	owner:   {type: String, regEx: SimpleSchema.RegEx.Id},
	readers: {type: [String], regEx: SimpleSchema.RegEx.Id, defaultValue: []},
	writers: {type: [String], regEx: SimpleSchema.RegEx.Id, defaultValue: []},
	public:  {type: Boolean, defaultValue: false},
});

Libraries.attachSchema(Schemas.Library);

Libraries.allow({
	insert(userId, doc) {
		return userId && doc.owner === userId;
	},
	update(userId, doc, fields, modifier) {
		return canEdit(userId, doc);
	},
	remove(userId, doc) {
		return canEdit(userId, doc);
	},
	fetch: ["owner", "writers"],
});

Libraries.deny({
	// For now, only admins can manage libraries
	insert(userId, doc){
		var user = Meteor.users.findOne(userId);
		return !user || !_.contains(user.roles, "admin");
	},
	update(userId, doc, fields, modifier) {
		// Can't change owners
		return _.contains(fields, "owner")
	},
	fetch: [],
});

const canEdit = function(userId, library){
	if (!userId || !library) return;
	return library.owner === userId || _.contains(library.writers, userId);
};

Libraries.canEdit = function(userId, libraryId){
	const library = Libraries.findOne(libraryId);
	return canEdit(userId, library);
};
