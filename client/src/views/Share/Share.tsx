import {Col, Container, Flex, Row} from '@acrool/react-grid';
import {toast} from '@acrool/react-toaster';
import React, {useEffect} from 'react';
import {useParams} from 'react-router';
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

const Share = () => {
    const {userId} = useParams<{ userId: string }>();



    return (
        <Container fluid>
            <Row>

                <Col col={12} md>
                    <Flex column className="align-items-start mb-10">
                        <h3>Notifications:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                        </Flex>
                    </Flex>
                </Col>

                <Col col={12} md>
                    <Flex column className="align-items-start mb-10">
                        <h3>Customer:</h3>
                        <Flex column className="align-items-start mb-10 text-left">
                        </Flex>
                    </Flex>
                </Col>
            </Row>
        </Container>
    );
};

export default Share;
