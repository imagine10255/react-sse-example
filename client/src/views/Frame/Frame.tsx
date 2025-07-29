import {Col, Container, Flex, Row} from '@acrool/react-grid';
import {toast} from '@acrool/react-toaster';
import React, {useEffect} from 'react';
import {useParams} from 'react-router';
import {Controller, SubmitHandler, useForm} from "react-hook-form";
import clsx from 'clsx';
import {isEmpty} from "@acrool/js-utils/equal";
import {useSSE} from "@/providers/SSEProvider/hooks/useSSE";
import styled from "styled-components";

/**
 * Login
 */
interface ILoginForm {
    userId: string
}

/**
 * Message
 */
interface IMessageForm {
    message: string
    eventType: 'notification' | 'custom'
    selectedUserId: string
}

const Frame = () => {
    const {userId} = useParams<{ userId: string }>();


    return (
       <IFrame src={`https://react-sse-example.pages.dev/broadcast/${userId}`}/>
    );
};

export default Frame;


const IFrame = styled.iframe`
    width: 100vw;
    height: 100vh;
`;
