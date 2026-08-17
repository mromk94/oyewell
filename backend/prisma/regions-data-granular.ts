export interface RegionNode {
  id: string;
  type: 'CONTINENT' | 'COUNTRY' | 'STATE' | 'CITY' | 'LGA' | 'POPULAR_STREET' | 'MARKET' | 'BUS_STOP';
  name: string;
  code: string;
  isCovered?: boolean;
  children?: RegionNode[];
}

export const lagosGranular: RegionNode = {
  id: 'ng-lagos',
  type: 'STATE',
  name: 'Lagos',
  code: 'LA',
  isCovered: true,
  children: [
    {
      id: 'ng-lagos-city',
      type: 'CITY',
      name: 'Lagos City',
      code: 'LA-CITY',
      isCovered: true,
      children: [
        {
          id: 'ng-lagos-ikeja',
          type: 'LGA',
          name: 'Ikeja',
          code: 'LA-IKEJA',
          isCovered: true,
          children: [
            { id: 'ng-lagos-ikeja-obafemi-awolowo-way', type: 'POPULAR_STREET', name: 'Obafemi Awolowo Way', code: 'LA-OAW', isCovered: true },
            { id: 'ng-lagos-ikeja-ikeja-city-mall', type: 'MARKET', name: 'Ikeja City Mall', code: 'LA-ICM', isCovered: true },
            { id: 'ng-lagos-ikeja-alausa-bus-stop', type: 'BUS_STOP', name: 'Alausa Bus Stop', code: 'LA-ALA', isCovered: true },
          ],
        },
        {
          id: 'ng-lagos-yaba',
          type: 'LGA',
          name: 'Yaba',
          code: 'LA-YABA',
          isCovered: true,
          children: [
            { id: 'ng-lagos-yaba-herbert-macaulay', type: 'POPULAR_STREET', name: 'Herbert Macaulay Way', code: 'LA-HMW', isCovered: true },
            { id: 'ng-lagos-yaba-tejuosho', type: 'MARKET', name: 'Tejuosho Market', code: 'LA-TEJ', isCovered: true },
            { id: 'ng-lagos-yaba-yaba-bus-stop', type: 'BUS_STOP', name: 'Yaba Bus Stop', code: 'LA-YAB', isCovered: true },
          ],
        },
        {
          id: 'ng-lagos-lekki',
          type: 'LGA',
          name: 'Lekki',
          code: 'LA-LEK',
          isCovered: true,
          children: [
            { id: 'ng-lagos-lekki-admiralty-way', type: 'POPULAR_STREET', name: 'Admiralty Way', code: 'LA-ADM', isCovered: true },
            { id: 'ng-lagos-lekki-lekki-phase-1', type: 'MARKET', name: 'Lekki Phase 1 Market', code: 'LA-LP1', isCovered: true },
          ],
        },
        {
          id: 'ng-lagos-surulere',
          type: 'LGA',
          name: 'Surulere',
          code: 'LA-SUR',
          isCovered: true,
          children: [
            { id: 'ng-lagos-surulere-adedeji', type: 'POPULAR_STREET', name: 'Adedeji Street', code: 'LA-ADD', isCovered: true },
            { id: 'ng-lagos-surulere-ojuelegba', type: 'BUS_STOP', name: 'Ojuelegba Bus Stop', code: 'LA-OJU', isCovered: true },
          ],
        },
      ],
    },
  ],
};

export const fctGranular: RegionNode = {
  id: 'ng-fct',
  type: 'STATE',
  name: 'Federal Capital Territory',
  code: 'FC',
  isCovered: true,
  children: [
    {
      id: 'ng-fct-abuja',
      type: 'CITY',
      name: 'Abuja',
      code: 'FC-ABJ',
      isCovered: true,
      children: [
        {
          id: 'ng-fct-wuse',
          type: 'LGA',
          name: 'Wuse',
          code: 'FC-WUS',
          isCovered: true,
          children: [
            { id: 'ng-fct-wuse-aminu-kano-crescent', type: 'POPULAR_STREET', name: 'Aminu Kano Crescent', code: 'FC-AKC', isCovered: true },
            { id: 'ng-fct-wuse-wuse-market', type: 'MARKET', name: 'Wuse Market', code: 'FC-WM', isCovered: true },
            { id: 'ng-fct-wuse-wuse-bus-stop', type: 'BUS_STOP', name: 'Wuse Bus Stop', code: 'FC-WB', isCovered: true },
          ],
        },
        {
          id: 'ng-fct-garki',
          type: 'LGA',
          name: 'Garki',
          code: 'FC-GAR',
          isCovered: true,
          children: [
            { id: 'ng-fct-garki-obafemi-awolowo-way', type: 'POPULAR_STREET', name: 'Obafemi Awolowo Way', code: 'FC-OAW', isCovered: true },
            { id: 'ng-fct-garki-garki-market', type: 'MARKET', name: 'Garki Market', code: 'FC-GM', isCovered: true },
          ],
        },
        {
          id: 'ng-fct-maitama',
          type: 'LGA',
          name: 'Maitama',
          code: 'FC-MAI',
          isCovered: true,
          children: [
            { id: 'ng-fct-maitama-aguiyi-ironsi', type: 'POPULAR_STREET', name: 'Aguiyi Ironsi Street', code: 'FC-AI', isCovered: true },
          ],
        },
      ],
    },
  ],
};

export const edoGranular: RegionNode = {
  id: 'ng-edo',
  type: 'STATE',
  name: 'Edo',
  code: 'ED',
  isCovered: true,
  children: [
    {
      id: 'ng-edo-benin',
      type: 'CITY',
      name: 'Benin City',
      code: 'ED-BEN',
      isCovered: true,
      children: [
        {
          id: 'ng-edo-oredo',
          type: 'LGA',
          name: 'Oredo',
          code: 'ED-ORE',
          isCovered: true,
          children: [
            { id: 'ng-edo-oredo-sapele-road', type: 'POPULAR_STREET', name: 'Sapele Road', code: 'ED-SPR', isCovered: true },
            { id: 'ng-edo-oredo-oredo-market', type: 'MARKET', name: 'Oredo Market', code: 'ED-OM', isCovered: true },
            { id: 'ng-edo-oredo-ring-road-bus-stop', type: 'BUS_STOP', name: 'Ring Road Bus Stop', code: 'ED-RB', isCovered: true },
          ],
        },
        {
          id: 'ng-edo-egor',
          type: 'LGA',
          name: 'Egor',
          code: 'ED-EGO',
          isCovered: true,
          children: [
            { id: 'ng-edo-egor-uwasota', type: 'POPULAR_STREET', name: 'Uwasota Road', code: 'ED-UWA', isCovered: true },
            { id: 'ng-edo-egor-egor-market', type: 'MARKET', name: 'Egor Market', code: 'ED-EM', isCovered: true },
          ],
        },
      ],
    },
  ],
};

export const accraGranular: RegionNode = {
  id: 'gh-greater-accra',
  type: 'STATE',
  name: 'Greater Accra',
  code: 'GA',
  isCovered: true,
  children: [
    {
      id: 'gh-greater-accra-accra',
      type: 'CITY',
      name: 'Accra',
      code: 'GA-ACC',
      isCovered: true,
      children: [
        {
          id: 'gh-greater-accra-accra-central',
          type: 'LGA',
          name: 'Accra Central',
          code: 'GA-AC',
          isCovered: true,
          children: [
            { id: 'gh-greater-accra-accra-central-oxford-street', type: 'POPULAR_STREET', name: 'Oxford Street', code: 'GA-OS', isCovered: true },
            { id: 'gh-greater-accra-accra-central-makola-market', type: 'MARKET', name: 'Makola Market', code: 'GA-MM', isCovered: true },
            { id: 'gh-greater-accra-accra-central-trotro-station', type: 'BUS_STOP', name: 'Trotro Station', code: 'GA-TS', isCovered: true },
          ],
        },
        {
          id: 'gh-greater-accra-east-legon',
          type: 'LGA',
          name: 'East Legon',
          code: 'GA-EL',
          isCovered: true,
          children: [
            { id: 'gh-greater-accra-east-legon-ainsworth-circle', type: 'POPULAR_STREET', name: 'Ainsworth Circle', code: 'GA-AC', isCovered: true },
            { id: 'gh-greater-accra-east-legon-a-c-square', type: 'MARKET', name: 'A&C Square', code: 'GA-AC2', isCovered: true },
          ],
        },
      ],
    },
  ],
};

export const nairobiGranular: RegionNode = {
  id: 'ke-nairobi',
  type: 'STATE',
  name: 'Nairobi',
  code: 'NB',
  isCovered: true,
  children: [
    {
      id: 'ke-nairobi-city',
      type: 'CITY',
      name: 'Nairobi City',
      code: 'NB-CITY',
      isCovered: true,
      children: [
        {
          id: 'ke-nairobi-westlands',
          type: 'LGA',
          name: 'Westlands',
          code: 'NB-WES',
          isCovered: true,
          children: [
            { id: 'ke-nairobi-westlands-waiyaki-way', type: 'POPULAR_STREET', name: 'Waiyaki Way', code: 'NB-WW', isCovered: true },
            { id: 'ke-nairobi-westlands-westgate', type: 'MARKET', name: 'Westgate Mall', code: 'NB-WG', isCovered: true },
            { id: 'ke-nairobi-westlands-sarit-centre', type: 'BUS_STOP', name: 'Sarit Centre Stage', code: 'NB-SC', isCovered: true },
          ],
        },
        {
          id: 'ke-nairobi-cbd',
          type: 'LGA',
          name: 'CBD',
          code: 'NB-CBD',
          isCovered: true,
          children: [
            { id: 'ke-nairobi-cbd-moi-avenue', type: 'POPULAR_STREET', name: 'Moi Avenue', code: 'NB-MA', isCovered: true },
            { id: 'ke-nairobi-cbd-city-market', type: 'MARKET', name: 'City Market', code: 'NB-CM', isCovered: true },
          ],
        },
      ],
    },
  ],
};
