# Laboratory bench

My Laboratory now opens on real bench work. It has three tabs.

## Microbiology bench

Nineteen unknowns, most from veterinary and agricultural practice:

- **Dairy cattle:** mastitis (group B strep)
- **Poultry:** fowl cholera (Pasteurella)
- **Pigs:** swine erysipelas, and a Brucella abortion storm
- **Horses:** foal pneumonia (Rhodococcus equi)
- **Sheep:** circling disease after silage (Listeria) and pulpy kidney (C. perfringens)
- **Beef cattle:** calf scours (E. coli) and shipping fever (Mannheimia)
- **Dogs:** a urinary infection (Proteus) and a chronic ear infection (Pseudomonas)
- **Birds:** sour crop in turkey poults (Candida) and aspergillosis in a cockatoo
- **People:** pneumococcus, B. cereus from fried rice, Yersinia from chitterlings, reptile-associated Salmonella, Campylobacter after a barbecue, and Vibrio parahaemolyticus from oysters

Each case runs like the bench:

1. Read the requisition.
2. Read the Gram stain.
3. Read the primary plates.
4. Set up any bench tests you like. There are 22 on the menu, and tests that wouldn't be run on the isolate say so. Results go onto a worksheet in the order you ran them.
5. Sign out an identification, with an optional report comment.

After sign-out you see the reference identification, the key findings that make it, and a short note on the disease or the organism's history. Photo captions naming the organism appear only after sign-out.

Photographs are from the CDC Public Health Image Library (public domain), credited on every image. Where CDC has no photo for a step, the result is written, as it would be on a worksheet. Three photos had printed labels that gave away the answer. They are cropped or masked; see `scripts/lab/phil-images.json`.

## Hematology

Seven 100-cell manual differentials on real Wright-stained cells, shown one at a time, with a ten-key counter: seg, band, lymph, mono, eos, baso, meta, myelo, pro and NRBC. NRBCs are counted per 100 white cells, and the bell rings at 100.

The cases are:

- a normal pre-op CBC
- pneumonia with a left shift
- eosinophilia after travel
- pertussis lymphocytosis in an infant
- monocytes returning after chemotherapy
- a leukoerythroblastic picture
- CML

The results compare her count with the reference labels, give absolute counts, and include an interpretation. She can review each cell where her call differed from the reference.

Cells come from the peripheral blood cell dataset of Acevedo et al. (Hospital Clínic de Barcelona; _Data in Brief_ 2020; CC BY 4.0), resized. The labels are the dataset's expert annotations. Patients are fictional. The dataset has normal cell types only, so there are no blasts, reactive lymphocytes or red-cell morphology yet.

## Microscope & notebook

The earlier specimen desk, microscope, comparison and Lab Notebook are unchanged. The lab opens on this tab when a slide is already in progress.

## Regenerating media

```sh
python3 scripts/lab/prepare_media.py --phil <folder of PHIL lores JPEGs named by ID> --pbc <PBC_dataset_normal_DIB.zip>
```

The script crops, resizes and hashes the images and writes `public/media/lab/manifest.json` and `public/media/cells/manifest.json`. The build checks every file's hash and confirms it is cached offline in Play only.

## Not done yet

- Bench and differential results are stored only in this browser. They are not in the JSON backup or in activity history.
- No independent specialist review yet. Reactions follow standard reference profiles; a few uncertain ones were left out rather than guessed.
