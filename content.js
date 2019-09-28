//========================================
//Event Listeners
//========================================

//Password field lose focus listener.
$("[type=password]").focusout(function() {
	//Get the password field that triggered the listener
	var txtPassword = $(this);
	
	//Check if the form is for sign up or log in.
	//No need to get complicated, just check how many password fields there are and the submit button's text.
	var countPasswords = 0;
	var hasLoginButton = false;
	var passwords = [];
	var form = txtPassword.closest("form")[0];
	
	for (var i = 0; i < form.length; i++) {
		if (form[i].type == "password") {
			countPasswords++;
			passwords.push(form[i].value);
		}
		else if (form[i].type == "button" || form[i].type == "submit") {
			var submit = form[i];
			var submitValue = submit.value.toUpperCase();
			var submitHtml = submit.innerHTML.toUpperCase();
			
			if (checkLoginButton(submitValue) || checkLoginButton(submitHtml))
				hasLoginButton = true;
		}
	}
	
	//If there's more than one password field or the button is a not log in button, it's a sign up form.
	var isSignup = false;
	if (countPasswords > 1 || !hasLoginButton)
		isSignup = true;
	
	//Make sure the current password field has text and that all passwords fields match if multiple present
	if (txtPassword[0].value.length == 0 || !verifyPasswordInputs(passwords))
		return;
	
	//We know if it's a sign up or log in. The triggering password field has a value, and all password fields match it.
	//Proceed with checking for password reuse and/or usage of wrong password.
	checkPassword(txtPassword[0].value, window.location.hostname, isSignup);
});

//Form listener to prevent enter key submission
$("form").keypress(function(e) {
	//Enter key
	if (e.which == 13) {
		var form = $(this)[0];
		for (var i = 0; i < form.length; i++) {
			if (form[i].type == "password") {
				return false;
			}
		}
		return true;
	}
});

//External link click listener. 
//Attach click event to external links.
$("a").each(function() {
	var link = $(this).prop("href");
	
	//Skip over 'links' that will cause errors when attempting to create URL
	if (link == "" || link == "javascript:;")
		return;
	
	var url = new URL(link);
	
	//If hostname is different, it is an external link
	if (window.location.hostname != url.hostname) {
		//Check if the URL hostname is whitelisted on click.
		$(this).mousedown(function() {
			checkWhitelist(url.hostname, link);
		});
	}
});


//========================================
//Helper Functions
//========================================

//Add a hostname to the user's whitelist
function addToWhitelist(hostname, url) {
	chrome.runtime.sendMessage({type: "whitelistAdd", hostname: hostname, url: url}, function(response) {
		window.location = response.url;
	});
}

//Handles the result of the password hash check
function callbackCheckPasswordHash(response) {
	//If no matching or non-matching credentials were found for the website and it's not a signup, inform the user.
	//Else if the password is in use, inform the user of reuse or website mismatch and clear the password fields. 
	//Otherwise, if we didn't find a matching record, add password hash to stored user data.
	if (!response.matchFound && !response.credentialsFound && !response.isSignup) {
		$("[type=password]").val("");
		swal("Bad Login Attempt", "No accounts could be found for this website.", "error");
	}
	else if (response.pwdInUse) {
		$("[type=password]").val("");
		if (response.isSignup) {
			swal("Password Reuse Detected", "This password is already in use on another website.", "error");
		}
		else {
			swal("Website - Password Mismatch", "The provided password belongs to another website.", "error");
		}
	}
	else if (!response.matchFound && response.isSignup) {
		chrome.runtime.sendMessage({type: "passwordHashAdd", hostname: response.hostname, hash: response.hash}, function(response) {
			var test = "test"; //TODO: remove? This is to prevent error message about channel closing too soon.
		});
	}
}

//Function that tries to determine if provided text belongs to a login button
function checkLoginButton(string) {
	return string.includes("LOG") || string.includes("SIGN IN");
}

//Hash the password and check if usage is valid
function checkPassword(password, hostname, isSignup) {
	chrome.runtime.sendMessage({type: "getSalt", password: password}, function(response) {
		var passwordHash = sha256(response.saltedPassword);
		chrome.runtime.sendMessage({type: "passwordHashCheck", hostname: hostname, isSignup: isSignup, hash: passwordHash}, callbackCheckPasswordHash);
		
		/*hashPassword(response.saltedPassword).then(hashedPassword => {
			var hashHex = hashToHex(hashedPassword);
			chrome.runtime.sendMessage({type: "passwordHashCheck", hostname: hostname, isSignup: isSignup, hash: hashHex}, callbackCheckPasswordHash);
		});*/
	});
}

//Pass hostname to background script to check if it's whitelisted
function checkWhitelist(hostname, url) {
	chrome.runtime.sendMessage({type: "whitelistCheck", hostname: hostname, url: url}, function(response) {
		//If it's not whitelisted, ask user how they want to proceed. Otherwise, follow link.
		if (!response.whitelisted) {
			swal("Unknown Domain: " + response.hostname, "This domain is not among the Alexa Top 10K, nor is it in your whitelist.", "warning",
			{
				buttons: {
					stop: 		"Stop",
					visit:		"Visit Once",
					whitelist: 	"Whitelist and Continue"
				}
			})
			.then((value) => {
				switch(value) {
					case "whitelist":
						addToWhitelist(response.hostname, response.url);
						break;
					case "visit":
						window.location = response.url;
						break;
				}
			});
		}
		else {
			window.location = response.url;
		}
	});
}

/*//Hash the salted password so we can safely store and compare passwords without using plaintext
function hashPassword(saltedPassword) {
	var encoder = new TextEncoder();
	var data = encoder.encode(saltedPassword);
	return window.crypto.subtle.digest("SHA-256", data);
}

//Converts the int array returned by crypto's subtle digest hashing into a hex string for later comparisons and storage
function hashToHex(hash) {
	var byteArray = new Uint8Array(hash);

	var hexCodes = [...byteArray].map(value => {
		var hexCode = value.toString(16);
		var paddedHexCode = hexCode.padStart(2, '0');
		return paddedHexCode;
	});

	return hexCodes.join('');
}*/

//Make sure password field values match on sign up forms (if they don't, we don't know which to use)
function verifyPasswordInputs(passwords) {
	var first = passwords[0];
	for (var i = 0; i < passwords.length; i++) {
		if (passwords[i] != first)
			return false;
	}
	return true;
}


//========================================
//Hashing Algorithm
//========================================
//Implementation of SHA-256 hashing algorithm, found at https://geraintluff.github.io/sha256/
function sha256(ascii) {
	function rightRotate(value, amount) {
		return (value>>>amount) | (value<<(32 - amount));
	};
	
	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j; // Used as a counter across the whole file
	var result = ''

	var words = [];
	var asciiBitLength = ascii[lengthProperty]*8;
	
	//* caching results is optional - remove/add slash from front of this line to toggle
	// Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
	// (we actually calculate the first 64, but extra values are just ignored)
	var hash = sha256.h = sha256.h || [];
	// Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];
	/*/
	var hash = [], k = [];
	var primeCounter = 0;
	//*/

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
			k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
		}
	}
	
	ascii += '\x80' // Append Ƈ' bit (plus zero padding)
	while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j>>8) return; // ASCII check: only accept characters in range 0-255
		words[i>>2] |= j << ((3 - i)%4)*8;
	}
	words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
	words[words[lengthProperty]] = (asciiBitLength)
	
	// process each chunk
	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
		var oldHash = hash;
		// This is now the undefinedworking hash", often labelled as variables a...g
		// (we have to truncate as well, otherwise extra entries at the end accumulate
		hash = hash.slice(0, 8);
		
		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			// Expand the message into 64 words
			// Used below if 
			var w15 = w[i - 15], w2 = w[i - 2];

			// Iterate
			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
				+ ((e&hash[5])^((~e)&hash[6])) // ch
				+ k[i]
				// Expand the message schedule if needed
				+ (w[i] = (i < 16) ? w[i] : (
						w[i - 16]
						+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
						+ w[i - 7]
						+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
					)|0
				);
			// This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
				+ ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj
			
			hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
			hash[4] = (hash[4] + temp1)|0;
		}
		
		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i])|0;
		}
	}
	
	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i]>>(j*8))&255;
			result += ((b < 16) ? 0 : '') + b.toString(16);
		}
	}
	return result;
};