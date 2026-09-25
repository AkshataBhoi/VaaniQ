import stanza

LANGUAGES = ["en", "hi", "mr"]

for lang in LANGUAGES:
    print(f"Downloading Stanza model: {lang}")

    stanza.download(
        lang,
        processors="tokenize,mwt,pos,lemma,depparse",
        verbose=True
    )

print("All Stanza models downloaded successfully.")