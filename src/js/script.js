// URLs for fetching data related to provinces, municipalities, fuels, and fuel stations
const URLprovinces =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/Provincias/";  // URL to fetch provinces
let URLmunicipality =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/MunicipiosPorProvincia/";  // URL to fetch municipalities by province
const URLfuel =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/ProductosPetroliferos/";  // URL to fetch fuel types

let URLFuelMunicipality =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroMunicipioProducto/";  // URL to fetch fuel stations based on municipality and fuel type

const selectProvinces = document.querySelector("#province-select"); 
const selectMunicipality = document.querySelector("#municipality-select");  
const selectFuel = document.querySelector("#fuel-select");
const openCheck = document.querySelector("#openGas");

// Initially disable the municipality select dropdown
selectMunicipality.disabled = true;

fetch(URLprovinces)
  .then((response) => response.text()) 
  .then((data) => {
    const json = JSON.parse(data); 

    json.forEach((province) => {  // Loop through each province
      let optionProvince = document.createElement("option");
      optionProvince.textContent = province.Provincia;  // Set the province name
      optionProvince.value = province.IDPovincia;  // Set the province ID

      selectProvinces.append(optionProvince);  // Append the option to the provinces select dropdown
    });
  });

// Enable municipalities dropdown when a province is selected
selectProvinces.addEventListener("change", () => {
  if (selectProvinces.value) {  // If a province is selected
    selectMunicipality.disabled = false;  // Enable the municipalities dropdown
    const dynamicURLmunicipality = URLmunicipality + selectProvinces.value;  // Create a dynamic URL based on selected province
    selectMunicipality.innerHTML =
      "<option value='' selected disabled>Select a municipality</option>";  // Reset municipality dropdown

    fetch(dynamicURLmunicipality)
      .then((response) => response.text())
      .then((data) => {
        const json = JSON.parse(data); 

        json.forEach((municipality) => {  // Loop through each municipality
          let optionMunicipality = document.createElement("option"); 
          if (selectProvinces.value == municipality.IDProvincia) {  // Ensure the municipality belongs to the selected province
            optionMunicipality.textContent = municipality.Municipio;  // Set the municipality name
            optionMunicipality.value = municipality.IDMunicipio;  // Set the municipality ID

            selectMunicipality.append(optionMunicipality);  // Append the option to the municipality select dropdown
          }
        });
      });
  } else {
    selectMunicipality.disabled = true;  // If no province is selected, disable the municipality dropdown
    selectMunicipality.innerHTML =
      "<option value='' selected disabled>Select a municipality</option>";  // Reset municipality dropdown
  }
});

fetch(URLfuel)
  .then((response) => response.text()) 
  .then((data) => {
    const json = JSON.parse(data); 

    json.forEach((fuel) => {  // Loop through each fuel type
      let optionFuel = document.createElement("option");
      optionFuel.textContent = fuel.NombreProducto;  // Set the fuel name
      optionFuel.value = fuel.IDProducto;  // Set the fuel ID

      selectFuel.append(optionFuel);  // Append the option to the fuel select dropdown
    });
  });

// Listen for changes on the fuel and municipality selects to fetch fuel stations
selectFuel.addEventListener("change", fetchFuelStations);
selectMunicipality.addEventListener("change", fetchFuelStations);

// Function to fetch and display fuel stations based on selected municipality and fuel type
function fetchFuelStations() {
  if (selectFuel.value && selectMunicipality.value && selectProvinces.value) {  // Ensure all selections are made
    const dynamicURLFuelMunicipality =
      URLFuelMunicipality + selectMunicipality.value + "/" + selectFuel.value;  // Build the dynamic URL based on selections

    // Clear any existing fuel station results
    document.querySelectorAll("#divFuelStation").forEach((el) => el.remove());

    fetch(dynamicURLFuelMunicipality)
      .then((response) => response.text()) 
      .then((data) => {
        const json = JSON.parse(data).ListaEESSPrecio; 

        // Filter stations by open status if the checkbox is checked
        const filteredStations = openCheck.checked
          ? json.filter((station) => isStationInService(station.Horario))  // Filter open stations based on schedule
          : json;

        // Render each filtered station
        filteredStations.forEach((fuelMunicipality) => {
          let containerStations = document.querySelector("#results-container");  // Container for results
          let divElement = document.createElement("div");  // Create a div for each station
          divElement.setAttribute("id", "divFuelStation");  // Set a unique ID for the station div
          let stationList = document.createElement("ul");  // Create an unordered list for station details

          stationList.innerHTML = `
              <li><strong>Address: ${fuelMunicipality.Dirección}</strong></li>
              <li>Town: ${fuelMunicipality.Municipio}</li>
              <li>Province: ${fuelMunicipality.Provincia}</li>
              <li>Schedule: ${fuelMunicipality.Horario}</li>
              <li>Price: ${fuelMunicipality.PrecioProducto}</li>
            `;

          divElement.append(stationList);  // Append the station list to the div
          containerStations.append(divElement);  // Append the div to the results container
        });
      })
      .catch((error) => {
        console.error("Error al obtener las estaciones:", error.message); 
      });
  }
}

openCheck.addEventListener("change", fetchFuelStations);

function isStationInService(schedule) {
  const now = new Date();  // Get current date and time
  const currentDay = now.getDay();  // Get the current day of the week (0-6, where 0 = Sunday)
  const currentTime = now.getHours() * 60 + now.getMinutes();  // Get the current time in minutes

  if (schedule.includes("L-D: 24H")) return true;  // If station is open 24 hours, return true

  // Map days of the week to numeric values
  const daysMap = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
  const hours = schedule.split(";");  // Split the schedule by semicolons

  // Check each time range in the schedule
  for (const hour of hours) {
    const [days, timeRange] = hour.split(": ");  // Split days and time range
    const [startDay, endDay] = days.split("-").map((d) => daysMap[d.trim()]);  // Get start and end days
    const [start, end] = timeRange
      .split("-")
      .map((t) => t.split(":").reduce((h, m) => h * 60 + Number(m)));  // Convert time range to minutes

    // Check if current time falls within the time range for the current day
    if (
      ((currentDay >= startDay && currentDay <= endDay) ||
        (endDay < startDay &&
          (currentDay >= startDay || currentDay <= endDay))) &&
      ((currentTime >= start && currentTime <= end) ||
        (end < start && (currentTime >= start || currentTime <= end)))
    ) {
      return true;  // Return true if the station is open
    }
  }
  return false;  // Return false if no valid time range matches
}