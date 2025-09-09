import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import joblib
import os

# Make sure 'models' directory exists
os.makedirs("models", exist_ok=True)

# ========= SPAM DETECTOR TRAINING ==========

normal_descriptions = [
    "Robbery reported at local bank",
    "Fire broke out in apartment building",
    "Suspicious person loitering outside the school",
    "Armed individual seen near shopping mall",
    "Attempted car theft in parking lot",
    "Multiple gunshots heard in downtown area",
    "Street fight between two individuals",
    "Explosion heard near railway station",
    "Gas leak detected in the neighborhood",
    "House burglary while owners were away",
    "Missing child reported in city park",
    "Stabbing incident near metro station",
    "Loud noise reported near industrial zone",
    "Motorcycle crash on highway",
    "Traffic accident involving three vehicles",
    "Break-in reported at electronics store",
    "Armed robbery at gas station",
    "Man found unconscious on sidewalk",
    "Woman attacked while jogging",
    "Hit and run reported near school",
    "Nadi ke qareeb lash mili",
    "Masjid ke bahar jhagda hua",
    "Park mein ajnabi shakhs bachon se baat kar raha tha",
    "Bridge ke neeche fire brigade bulayi gayi",
    "Police ne ek chori shuda gaari baramad ki",
    "Hospital ke samne danga hua",
    "Cycle chori hone ki report file hui",
    "Public transport mein musafir ka mobile chori hua",
    "Ghar mein dakhil hone ki koshish hui",
    "Jamaat ke doran fire alarm chala",
    "Train station ke qareeb ajnabi bag mila",
    "Bus stand par afraad ka jhagda hua",
    "ATM par shakhs ne forcefully paise nikalwaye",
    "Warehouse mein aag lag gayi",
    "School ke andar security breach hua",
    "Road par andheray mein shakhs mashkook laga",
    "Car accident ke baad fire lagi",
    "Mobile snatching ki koshish hui",
    "Motorbike par do afraad ne wallet cheena",
    "Market mein chor pakra gaya",
    "Gas cylinder phat gaya",
    "Chhat se kisi ne pathar phenka",
    "Lift mein shakhs ne aurat ko tang kiya",
    "Hospital mein patient ka saman chori hua",
    "Bakra mandi se janwar chori hua",
    "Highway par truck ka accident hua",
    "Hostel ke andar chori ki report",
    "Building mein elevator mein phans gaye log",
    "Garage mein daka pada",
    "Train mein musafir se saman cheena gaya",
    "Thana mein FIR darj karwayi gayi"
] * 4  # Replicate to increase volume (~200)

spam_descriptions = [
    "Congratulations! You have won a brand new car!",
    "Urgent: Verify your identity to avoid suspension",
    "Claim your free hotel stay now!",
    "Limited time offer! Act fast to win rewards",
    "Click this link for a secret cash bonus",
    "You have unclaimed crypto in your wallet",
    "Your number is selected for lucky draw",
    "Free recharge jeetne ka moka chhodiye mat",
    "Tumhara gift tayar hai, abhi claim karo",
    "Aaj ka lucky winner aap ho",
    "Apna CNIC bhejo aur 20 hazar lo",
    "Earn via scratch card spins daily",
    "Amazon reward claim karne ka last chance",
    "Join our telegram and get $10 free",
    "Tumhara Gmail password expire hone wala hai",
    "Tumhara mobile hack hone wala hai",
    "Get 5 lakh rupees by filling this form",
    "Download this app and earn every hour",
    "Click kro aur free game credits lo",
    "Your OTP is 456723 — don’t share it"
] * 10  # Replicate to increase volume (~200)

all_descriptions = normal_descriptions + spam_descriptions
labels = ["real"] * len(normal_descriptions) + ["spam"] * len(spam_descriptions)

df_spam = pd.DataFrame({
    "description": all_descriptions,
    "label": labels
})

# Train vectorizer and model
spam_vectorizer = TfidfVectorizer()
X_spam = spam_vectorizer.fit_transform(df_spam["description"])
y_spam = df_spam["label"]

spam_model = MultinomialNB()
spam_model.fit(X_spam, y_spam)

# ✅ Save
joblib.dump(spam_model, "models/spam_detector_model.pkl")
joblib.dump(spam_vectorizer, "models/spam_vectorizer.pkl")

print("✅ Spam detector trained and saved.")


# ========= INCIDENT TYPE CLASSIFIER ==========

incident_data = {
    "description": [...],  # ← keep your descriptions here (already correct)
    "type": [...]          # ← keep your types here (already correct)
}

df_type = pd.DataFrame(incident_data)

incident_vectorizer = TfidfVectorizer()
X_type = incident_vectorizer.fit_transform(df_type["description"])
y_type = df_type["type"]

incident_model = MultinomialNB()
incident_model.fit(X_type, y_type)

# ✅ Save
joblib.dump(incident_model, "models/incident_classifier.pkl")
joblib.dump(incident_vectorizer, "models/vectorizer.pkl")

print("✅ Incident classifier trained and saved.")
