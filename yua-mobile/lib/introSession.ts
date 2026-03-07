let introShown = false;

export async function shouldShowIntro() {
  return !introShown;
}

export async function markIntroShown() {
  introShown = true;
}
