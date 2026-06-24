# Jack — Avatar Image Generation Prompt

**Character:** Jack Skellington  
**Universe:** The Nightmare Before Christmas (Tim Burton / Henry Selick, 1993)  
**Arcane Role:** Operations Communications (Standby)

---

## Image Generation Prompt

### Midjourney / DALL-E / Stable Diffusion

```
Portrait of Jack Skellington as a professional AI agent avatar.
Tall, impossibly thin skeleton figure in a perfectly tailored black pinstripe suit
with a large black bat bowtie. White skull face with hollow dark eyes conveying
warmth and genuine theatrical enthusiasm — not menacing. Studio lighting, dramatic
shadows. Stylized gothic-corporate portrait aesthetic. Square format 1:1,
suitable for small avatar icon use (legible at 64px). Bold high-contrast silhouette.
Black-and-white palette with subtle pale blue highlights.
```

### Character Notes

- **Recognizability:** Keep proportions exaggerated — Jack is tall, elongated, rail-thin
- **Expression:** Reads as "enthusiastic and theatrical" not scary. Warm hollow eyes
- **Context:** Professional / corporate setting — suit and bat bowtie, NOT the Santa outfit
- **Scale:** Avatar must read clearly at 32×32 px — keep features bold, silhouette iconic
- **Signature items:** Bat bowtie (not a standard tie), pinstripe suit, zero visible hair
- **Skin/colour:** White skull — no skin tone; stark monochrome with blue accent only

### Palette

| Token       | Hex       | Usage                               |
| ----------- | --------- | ----------------------------------- |
| Primary     | `#1a1a1a` | Suit, bowtie, shadows               |
| Skull white | `#f0f0f0` | Face, shirt                         |
| Accent      | `#7eb8d4` | Subtle highlight — eyes, pinstripes |
| Background  | `#2c2c2c` | Dark neutral                        |

### Negative Prompts

```
santa hat, red clothing, dog, oogie boogie, christmas, candy cane,
scary expression, menacing, horror, photorealistic, 3d render
```

---

## Reactivation Checklist

When Jack is re-benched back into active duty, generate a new avatar using the
prompt above and save it as `jack.png` (512×512 minimum, square).

See `jack.yaml` in this directory for the full persona definition and
reactivation instructions.
