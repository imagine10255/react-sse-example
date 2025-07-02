import {block} from '@acrool/react-block';
import {Flex} from '@acrool/react-grid';
import {useLocale} from '@acrool/react-locale';
import {toast} from '@acrool/react-toaster';
import React from 'react';
import {useNavigate} from 'react-router';


const Dashboard = () => {
    const navigate = useNavigate();
    const {t, locale, setLocale} = useLocale();


    return  <div>
        <h2>Dashboard</h2>

    </div>;
};

export default Dashboard;
