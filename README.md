### Version: TKLC_151129_v1.1.0  
Date: 2015-11-29  
Docs, examples, updates at: https://github.com/Tastenkunst/TKLC

##### Copyright (c) 2015, Tastenkunst GmbH. All rights reserved.

Includes support for the following Local Connection APIs:
+ postMessage
+ postMessage bridge (for test embedding of LC ads in one html file )
+ sessionStorage (not allowed on all Google Ad platforms, will also fail with Third-Party-Cookies disabled in browser settings)
+ DirectMessage (TKLC implementation of direct javascript access of same origin iframes)
+ FlashTalking talk Method (based on postMessage)
+ FlashTalking Talk class (based on a DirectMessage approach)
+ Adform (based on postMessage)
+ IQ Digital (+ their postMessage Message Bridge)

DirectMessage will also work on 
+ MediaMind/Sizmek and 
+ DoubleClick,  
if ads are served as same origin for an ad placement.

##### @author: Marcel Klammer, m.klammer@tastenkunst.com

### Single Download of current release:
https://www.dropbox.com/s/1vrk2cq1vq9r3z0/TKLC_151129_v1.1.0_release.zip?dl=0

### Example Previews:

##### tklib.TKLC.API__DIRECT_MESSAGE (recommended for same origin placements)
https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.1.0/directmessage/728x90_200x600/index.html

##### tklib.TKLC.API__POST_MESSAGE (recommended for cross domain placements)
https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.1.0/postmessage/728x90_200x600/index_bridge_simple.html
https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.1.0/postmessage/728x90_200x600/index_bridge_tklc.html

##### tklib.TKLC.API__SESSION_STORAGE (not recommended, since Google doesn't allow it and disabled third party cookies prevent it)
https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.1.0/sessionstorage/728x90_200x600/index.html

##### tklib.TKLC.API__FLASHTALKING_DM (DirectMessage approach, recommended for FT placements, since they are usually same origin)
http://www.flashtalking.net/view/demo/52821/5/?684

##### tklib.TKLC.API__FLASHTALKING_PM (postMessage)
http://www.flashtalking.net/view/demo/52821/4/?808

##### tklib.TKLC.API__DIRECT_MESSAGE (DirectMessage working on FlashTalking, leave out the communication part in the manifest.js, NOT recommended for FT placements)
http://www.flashtalking.net/view/demo/52821/6/?561

##### tklib.TKLC.API__ADFORM
http://www.adform.com/LivePreviewHtmlInject/LivePreview.ashx?tag=4742301&e=0&positioning=1%3Dx%3A357%2Cy%3A0%2Cs%3Afalse%3B2%3Df%3A1%2Cp%3ALiTi%2Cx%3A-728%2Cy%3A0%2Cz%3A10000%2Cs%3Afalse

##### Swiffy Wallpaper (example uses API__DIRECT_MESSAGE, but could be any other method)
https://tastenkunst.s3.amazonaws.com/libs/tklc/releases/v1.1.0/swiffy/728x90_160x600/index.html

##### Sizmek/MediaMind (example uses API__DIRECT_MESSAGE)
http://platform.mediamind.com/Eyeblaster.Preview.Web/Default.aspx?previewID=CopSZfyM%2F7ZzN0bW0RcvZXjnlx%2F%2BRa%2FhQ0N3oZEg%2F1%2FLNsfbNGQthw%3D%3D&AdID=32380445&lang=en-US

##### DoubleClickStudio (example uses API__DIRECT_MESSAGE), yeah I know it looks stupid, but can't do much about it
https://www.google.com/doubleclick/studio/externalpreview/#/73014uc0Trqoumc7p8CZew

### Current state of HTML local connection ads:

There is no standard yet. It breaks down to two situations:

window.top (site embedding the ads)
+ ad iframe 1: protocol: https:// - document.domain: s0.cdn.example.com
+ ad iframe 2: protocol: https:// - document.domain: s0.cdn.example.com  
-> same origin

window.top (site embedding the ads)
+ ad iframe 1: protocol: https:// - document.domain: s0.cdn.example.com
+ ad iframe 2: protocol: https:// - document.domain: s1.cdn.example.com  
-> different subdomains -> cross domain  
&nbsp;&nbsp;&nbsp;&nbsp;-> try to rewrite document.domain to cdn.example.com  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-> success only if cdn.example.com or example.com is no TLD -> same origin  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-> fail -> cross domain  

same origin: tklib.TKLC.API__DIRECT_MESSAGE should perfectly work for developers, ad servers and publishers  
cross domain: tklib.TKLC.API__POST_MESSAGE (in any form) is the way to go, but ad servers and publishers need to relay/bridge messages, which is a pain for all parties involved.

Conclusion: Get the Ad Servers and Publishers to the point where they go for the same subdomain for serving ads for one ad placement. E.g. all elements of a Wallpaper or Fireplace should be served from one subdomain, can't be that hard, uh?

### Ad platforms:

##### Google/DoubleClick:
+ Does not allow local/session storage (https://support.google.com/richmedia/answer/2853194?hl=en),
+ has a techlab prototype experiment of a Local Connect API (https://www.richmediagallery.com/detailPage?id=8135), but
+ only sends out that prototype to Core Certified Developers  
-> No real LC support via the Enabler API.  
-> Same origin: tklib.TKLC.API__DIRECT_MESSAGE works fine.

##### Sizmek:
+ Doesn't seem to have an own EB API solution.
+ Sizmek support suggested sessionStorage in September, but I won't use that for obvious reasons.  
-> Same origin: tklib.TKLC.API__DIRECT_MESSAGE works fine.

##### FlashTalking:
+ Has two own myFT API solutions:
+ 1. talk method (postMessage)
+ 2. Talk class (Direct Message approach), independent from publishers, since FT serves (usually?) all ads of one placement with same origin.  
-> Recommended: Use myFT Talk class (tklib.TKLC.API__FLASHTALKING_DM).

##### Adform:
+ Has an own postMessage API.  
-> Recommended: Use their API (tklib.TKLC.API__ADFORM).

##### Swiffy:
+ All APIs are possible, since
+ it just adds another layer of ExternalInterface.calls in the FLA file.
