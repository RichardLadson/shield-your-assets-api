// src/data/estateRecovery/index.js

const stateFiles = {
  'alabama': () => require('./alabama.json'),
  'alaska': () => require('./alaska.json'),
  'arizona': () => require('./arizona.json'),
  'arkansas': () => require('./arkansas.json'),
  'california': () => require('./california.json'),
  'colorado': () => require('./colorado.json'),
  'connecticut': () => require('./connecticut.json'),
  'delaware': () => require('./delaware.json'),
  'florida': () => require('./florida.json'),
  'georgia': () => require('./georgia.json'),
  'hawaii': () => require('./hawaii.json'),
  'idaho': () => require('./idaho.json'),
  'illinois': () => require('./illinois.json'),
  'indiana': () => require('./indiana.json'),
  'iowa': () => require('./iowa.json'),
  'kansas': () => require('./kansas.json'),
  'kentucky': () => require('./kentucky.json'),
  'louisiana': () => require('./louisiana.json'),
  'maine': () => require('./maine.json'),
  'maryland': () => require('./maryland.json'),
  'massachusetts': () => require('./massachusetts.json'),
  'michigan': () => require('./michigan.json'),
  'minnesota': () => require('./minnesota.json'),
  'mississippi': () => require('./mississippi.json'),
  'missouri': () => require('./missouri.json'),
  'montana': () => require('./montana.json'),
  'nebraska': () => require('./nebraska.json'),
  'nevada': () => require('./nevada.json'),
  'newHampshire': () => require('./newHampshire.json'),
  'newJersey': () => require('./newJersey.json'),
  'newMexico': () => require('./newMexico.json'),
  'newYork': () => require('./newYork.json'),
  'northCarolina': () => require('./northCarolina.json'),
  'northDakota': () => require('./northDakota.json'),
  'ohio': () => require('./ohio.json'),
  'oklahoma': () => require('./oklahoma.json'),
  'oregon': () => require('./oregon.json'),
  'pennsylvania': () => require('./pennsylvania.json'),
  'rhodeIsland': () => require('./rhodeIsland.json'),
  'southCarolina': () => require('./southCarolina.json'),
  'southDakota': () => require('./southDakota.json'),
  'tennessee': () => require('./tennessee.json'),
  'texas': () => require('./texas.json'),
  'utah': () => require('./utah.json'),
  'vermont': () => require('./vermont.json'),
  'virginia': () => require('./virginia.json'),
  'washington': () => require('./washington.json'),
  'westVirginia': () => require('./westVirginia.json'),
  'wisconsin': () => require('./wisconsin.json'),
  'wyoming': () => require('./wyoming.json')
};

function getStateEstateRecovery(state) {
  const stateName = state.toLowerCase().replace(' ', '_');
  if (!stateFiles[stateName]) {
    throw new Error(`Estate recovery data not found for state: ${state}`);
  }
  return stateFiles[stateName]();
}

function getAllStates() {
  return Object.keys(stateFiles);
}

module.exports = {
  getStateEstateRecovery,
  getAllStates
};