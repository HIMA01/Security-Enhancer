# security-enhancer #
Browser extension to enhance security for the passwords

## Introduction ##
The chrome extension ensures the user's security. It has the following features.

* Detect password reuse: Users unfortunately tend to reuse passwords across websites. Whenever one of these websites is compromised, attackers can take advantage of these passwords and use them against different services. The ideal solution to this problem is to stop users from re-using passwords in the first place. Your browser extension should be able to detect when a user is creating a new account on a website and compare the password that the user has selected against all other previously stored passwords. If the password is the same, the extension should warn the user and encourage him to choose a different password.
* Detect the entering of passwords on the wrong website: Assuming that we have convinced users to use unique passwords, we can now detect whether the user is trying to login to a website with the password of a different website. This should allow us to protect users from falling victim to phishing attacks (e.g. detect that the user is entering her paypal.com password to the attacker.com website).
* Modify link-clicking behavior: Some security researchers have argued that most users would be protected if software would stop them from visiting unpopular websites. Your extension should inspect all links in all webpages visited and for those links that are leading the user outside of the Alexa top 10K websites, the user should be warned if they click on that link. The user should have the option to dismiss the block once (i.e. be allowed to visit that website) or for ever (i.e. ask the extension not to bother her next time she visits that particular website).


## Design ##

We store all the hased passwords along with the domains against each chrome user in the following way.


#### Users Table ####
User Id       | UserName      | 
------------- | ------------- | 
1             | User A        |

#### Account Table ####
User Id       | Domain        | AccountName   | PasswordHash |
------------- | ------------- | ------------- | -------------|
1             | Domain A      | Account A     | ######       |

AccountName column may not be necessary, outside of clarity's sake

#### Website WhiteList ####
User Id       | Domain        |
------------- | ------------- |
1             | Domain A      |

### Detect Password Reuse ###
Everytime the user enters a password for a new website while signing up, we issue a alert saying that this password has been used already for a different website.
This can be cheked by comparing the userId and his existing passwords in the database.


### Detect the entering of passwords on the wrong website  ###
If the user enters a password of a different website, we issue an alert saying that the user is trying to enter a differnt website's password.
This can be checked by comparing the user's password with the domain he is trying to enter.

### Modify link-clicking behavior ###
Everytime user clicks on any link in the webpage, we check if the domain he is trying to enter is in Alexa top 10000 websites by using Alexa API provided in references. If the rank of the website falls above 10000, then we issue a warning saying this isn't a safe website. If the user still wants to enter the website, then we store the website to his whitelisted websites in the database.



## References ##
* https://aws.amazon.com/alexa-top-sites/
* https://www.alexa.com/siteinfo/facebook.com
* https://sweetalert.js.org/guides/
