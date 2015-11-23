/*!
 * Version: TKLC_151119_v1.0.9
 * Date: 2015-11-19
 * Updates and docs at: https://github.com/Tastenkunst/TKLC
 *
 * Copyright (c) 2015, Tastenkunst GmbH. All rights reserved.
 *
 * Includes support for the following Local Connection APIs:
 * + postMessage
 * + postMessage bridge (for test embedding of LC ads in one html file )
 * + sessionStorage (works well, but Google does not allow it)
 * + FlashTalking talk Method (based on postMessage)
 * + FlashTalking Talk class (based on local storage)
 * + Adform (based on postMessage)
 * + IQ Digital (+ their postMessage Message Brigde)
 *
 * @author: Marcel Klammer, m.klammer@tastenkunst.com
 **/

##########

Download:
https://www.dropbox.com/s/7qk25rrpwi6h2xf/TKLC_151119_v1.0.9_release.zip?dl=0

##########

Example Previews: 

tklib.TKLC.API__POST_MESSAGE

https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.0.9/postmessage/728x90_160x600/index_bridge_tklc.html
https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.0.9/postmessage/728x90_160x600/index_bridge_simple.html

tklib.TKLC.API__SESSION_STORAGE

https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.0.9/sessionstorage/728x90_160x600/index.html

tklib.TKLC.API__FLASHTALKING_PM (postMessage)

http://www.flashtalking.net/view/demo/52821/2/?319

tklib.TKLC.API__FLASHTALKING_LS (storage)

http://www.flashtalking.net/view/demo/52821/1/?9507732

tklib.TKLC.API__ADFORM

http://www.adform.com/LivePreviewHtmlInject/LivePreview.ashx?tag=4677437&e=0&positioning=1%3Dx%3A-80%2Cy%3A0%2Cs%3Afalse%3B2%3Dx%3A728%2Cy%3A0%2Cs%3Afalse

Swiffy Wallpaper:
https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.0.9/swiffy/728x90_160x600/index.html

Sizmek/MediaMind:
http://platform.mediamind.com/Eyeblaster.Preview.Web/Default.aspx?previewID=Dv5jAPSVmL3crgFxVsLSMj5UnAhKx5gYEAv4lI66fNZ1rmwWAwTQnA%3D%3D&AdID=32154631&lang=en-US

##########

Current state of HTML local connection ads, that we are aware of:

Google/DoubleClick:
+ does not allow local/session storage (https://support.google.com/richmedia/answer/2853194?hl=en)
+ has a techlab prototype experiment of a Local Connect API (https://www.richmediagallery.com/detailPage?id=8135)
+ only sends out that prototype to Core Certified Developers
+ conclusion: no common available solution ready.
-> No LC support

Sizmek:
+ Doesn't seem to have an own solution.
+ Sizmek support suggested sessionStorage in September

FlashTalking:
+ has two solutions:
+ 1. talk method (postMessage), works well in some cased, doesn't work in others, eg. IQ Digital with twice encapsulated iframes
+ 2. Talk class (local storage), works well all the time. Some sites might reject the usage of storage, like Google does.

Adform:
+ has own postMessage API. Worked for us 100% up until now.

Swiffy:
+ All APIs possible
+ it just adds another layer of ExternalInterface.calls in the FLA file




