var storage = chrome.storage.local;


//========================================
//Event Listeners
//========================================
document.getElementById("export").addEventListener("click", dataExport);
document.getElementById("import").addEventListener("click", dataImport);
document.getElementById("upload").addEventListener("change", dataUpload);


//========================================
//Functions
//========================================

//Get the user's stored data and download it to a file.
function dataExport() {
	storage.get(null, function(data) {
		var fileData = new Blob([JSON.stringify(data)], { "type": "text/plain" });
		var fileName = "security enhancer user data.txt";
		
		//To download the file, set up a link element and click it.
		var download 		= document.createElement("a");
		download.download 	= fileName;
		download.href 		= URL.createObjectURL(fileData);
		download.click();
	});
}

//Show the file chooser
function dataImport() {
	document.getElementById("upload").style.visibility = "visible";
}

//Process the selected file, uploading its contents to storage.
function dataUpload(event) {
	var file = event.target.files[0];
	if (file) {
		storage.clear();
		
		var reader = new FileReader();
		reader.onload = function(e) {
			var data = JSON.parse(e.target.result);
			
			//Look for the keys we are using: pwd for our password datastructure, and wl for the whitelist
			for (var key in data) {
				if (key == "pwd")
					storage.set({"pwd": data[key]}, function() {});
				else if (key == "salt")
					storage.set({"salt": data[key]}, function() {});
				else if (key == "wl")
					storage.set({"wl": data[key]}, function() {});
			}
		}
		reader.readAsText(file);
		
		//Hide the file chooser
		document.getElementById("upload").style.visibility = "hidden";
	}
}