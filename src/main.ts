import Ganko from "./Ganko";

const app = document.querySelector("#app")!;
const btn = document.querySelector("#btn")! as HTMLButtonElement;

let loading = true;

function isDevelopmentMode() {
  return import.meta.env.MODE === "development";
}

async function loadComponents() {
  if (isDevelopmentMode()) {
    await Promise.all([
      Ganko.read("./components/conditional.templ")
    ]);
    console.log(Ganko.getTemplate("Conditional"));
  } else {
    await Ganko.fromJSONFile("./components/all.json");
  }
  loading = false;
}

await loadComponents();

interface ConditionalProps {
  open: boolean;
}

btn.addEventListener("click", () => {
  if (!loading) {
    Ganko.useTemplate<ConditionalProps>("Conditional", app, { }, {
      btn: {
        click: (_, templ) => {
          templ.update({
            open: !templ.getState().open
          });
        }
      }
    });
  }
});