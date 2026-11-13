# Running the Duratek site: the owner's guide

Everything here is done from the admin screens at `/admin`, after logging in at `/trade/login` with an administrator account. No code or database access is needed. Each screen appears only for administrators who have its permission.

## Every day

**Approve a trade application** (Trade accounts)
- Open Trade accounts. New applications are under "Waiting".
- Read the business details. Choose a price tier, then Approve. The applicant is emailed.
- To turn one down, choose Reject and give a reason. The reason stays internal; the applicant gets a polite email without it.

**Send a sample request** (Samples)
- Open Samples. Requests are listed oldest first.
- Pack the samples. Optionally press "Start packing" so colleagues can see it is in hand.
- Enter the carrier and tracking reference if you have them, leave "Email the customer" ticked, and press "Mark sent".
- The screen tells you whether the email was sent. If it says the email failed, the request is still marked sent; contact the customer yourself if it matters.

**Answer an enquiry** (Enquiries)
- Open Enquiries. Each message shows who it is from and, if it is for a stockist, whether the customer agreed to share their details.
- If they agreed and the message hasn't been passed on, press "Pass to the stockist by email".
- Reply to the customer from your own email, then press "Mark contacted". Close it when it is finished.

## When things change

**A finish runs out of samples** (Samples, "Sample availability")
- Press "Mark out of stock" beside the finish. The site stops offering it as a sample at once. Press "Mark available" when stock is back.

**Change a price** (Prices)
- The grid at the top holds today's price per m² for the RRP, standard trade and each tier. Change a figure and Save.
- For a price that starts on a future date, a volume price or a promotion, open the list under "Price lists" and add a line with its dates.
- "Review price history" shows who changed which price and when.
- RRPs include VAT. Trade prices exclude it.

**Give one account its own price** (Trade accounts, then the account)
- Open the account and enter its prices. They win over its tier.

**Add or edit a finish** (Finishes)
- "Add a finish" for a new one; open an existing one to edit its name, description, sizes and pack coverage.
- Add photographs under Photographs. The plank swatch leads on cards; room scenes fill the gallery.
- Untick Published to hide a finish for a while. Use "Archive finish" to retire it; nothing is deleted and it can be restored.

**Add a stockist** (Where to buy)
- Enter only details the business has confirmed. Tick the finishes it carries.
- A stockist cannot be shown on the site until "Verified" is ticked. Tick it once you have confirmed the details with the business, then tick "Show on Where to buy".
- Under "Private", enter the address enquiries should go to. Customers never see it.
- The site never says a stockist has a product in stock. It tells customers to check with the stockist.

**Upload a document** (Documents)
- Choose the file, give it a title and a type. Guides, warranties and certificates are PDF; photography is PNG, JPEG or WebP.
- Leave "Trade only" ticked for documents only approved trade accounts should download.

**Suspend an account** (Trade accounts)
- Open the account's row, choose Suspend and give a reason. It loses trade prices and tools at once. Reinstate it the same way.

## Privacy

**Someone asks what you hold about them, or to be deleted** (Privacy)
- Requests made at `/privacy/request` appear under Requests with a reply-by date one month out. Log requests that arrive by email or post with "Log a request".
- Check who is asking before doing anything. A reply from the email address on file is a reasonable check.
- For a copy: enter their email under "Export their data" and send them the file.
- To delete: enter their email under "Erase their data", tick the box and press Erase. Their name, contact and address details are removed from sample requests and enquiries. This cannot be undone.
- A trade customer can download or delete their own account from their Settings. To delete one for them, open the account under Trade accounts.

**How long things are kept** (Settings)
- The retention periods are in Settings. A daily job applies them. "Run retention now" on the Privacy screen applies them at once.

**The email log** (Privacy, at the foot)
- Every email the site tried to send, with the real result: Sent, Failed, or Not configured. Look here if a customer says an email never arrived.

## Reading the numbers

- **Overview** shows what is waiting for you and counts for products, accounts, stockists, samples and enquiries.
- **Analytics** shows the most viewed finishes, the most requested samples, enquiries, account growth and quote activity.
- Views are page loads, not people. Enquiries are messages, not orders. Quotes are the traders' own quotes to their customers: an accepted quote is not a Duratek sale. The site does not record sales.
- Traders' quotes, prices to their customers and margins are private to them. You see counts only.

## Who can do what

Trade accounts, then an administrator's row, sets their permissions: accounts, pricing, products, Where to buy and enquiries, samples, documents, settings and privacy, reports, and the audit log. Give each person only what they need. The Audit log shows who changed what, and when.

## If something looks wrong

- A page says figures couldn't be loaded: a database update may be pending. Tell your developer.
- Emails are logged as "Not configured": the email provider's keys are missing on the server.
- Emails are logged as "Not sent (preview build)": you are on a test copy of the site, not the live one.
