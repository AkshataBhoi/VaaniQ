import stanza
import os

resources_dir = os.path.join(os.path.dirname(__file__), 'api', 'stanza_resources')
os.makedirs(resources_dir, exist_ok=True)

LANGUAGES = ["en", "hi", "mr"]

for lang in LANGUAGES:
    print(f"Downloading Stanza model: {lang}")

    stanza.download(
        lang,
        dir=resources_dir,
        processors="tokenize,mwt,pos,lemma,depparse",
        verbose=True
    )

print("All Stanza models downloaded successfully.")