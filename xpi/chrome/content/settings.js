function resetAll(event) {
	// TODO: resetAll shouldn't apply instantly unless prefs normally do
	var prefs = document.getElementsByTagName("preference");
	for (var i=0; i<prefs.length; i++)
		if (prefs[i].hasUserValue)
			prefs[i].reset();
}
function updateDarktheme(event) {
	document.getElementById("darktheme").disabled = (document.getElementById("color").value == "0" && !document.getElementById("darkenchildren").checked && !document.getElementById("emphasizegroups").checked && (document.getElementById("tabbarposition").value == "0" || document.getElementById("tabbarposition").value == "2"));
}
function updateTabBarWidth(event) {
	document.getElementById("tabbarwidth").disabled = (document.getElementById("tabbarposition").value == "0" || document.getElementById("tabbarposition").value == "2");
}